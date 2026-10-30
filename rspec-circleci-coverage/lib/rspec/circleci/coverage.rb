require 'coverage'
require 'json'
require 'pathname'

module RSpec
  module CircleCI
    class Coverage
      class << self
        attr_accessor :instance
      end

      def self.install
        # Only install if CIRCLECI_COVERAGE environment variable is set
        return unless ENV['CIRCLECI_COVERAGE']

        self.instance ||= new
        instance.install
      end

      def initialize
        @coverage_data = Hash.new { |h, k| h[k] = {} }
        @before_coverage = {}
        # Files each example group's before(:context) setup executed
        @group_setup_files = {}
        @setup_group = nil
        @setup_start_coverage = nil
        @installed = false
      end

      def install
        return if @installed
        @installed = true

        # Start coverage tracking if not already running
        unless ::Coverage.running?
          ::Coverage.start(lines: true, eval: true)
        end

        coverage_instance = self

        # Hook into RSpec lifecycle
        RSpec.configure do |config|
          config.before(:suite) do
            $stdout.write("rspec-circleci-coverage: generating CircleCI coverage JSON...\n")
            # Notify us as each group starts, nested groups included. Registered here
            # rather than at install so the reporter is built after the formatters
            config.reporter.register_listener(coverage_instance, :example_group_started)
          end

          config.before(:each) do |_|
            # Take a snapshot before each test
            coverage_instance.capture_coverage
          end

          config.after(:each) do |example|
            # Take a snapshot after each test and record coverage
            coverage_instance.record_test_coverage(example)
          end

          config.after(:suite) do
            # Write coverage data to file
            coverage_instance.write_coverage_data
          end
        end
      end

      # Group setup (before(:context), let_it_be) runs outside example snapshots.
      # It lasts from the group's start until its first example or nested group.
      def example_group_started(notification)
        snapshot = ::Coverage.peek_result
        finish_group_setup(snapshot)
        @setup_group = notification.group
        @setup_start_coverage = snapshot
      end

      def capture_coverage
        @before_coverage = ::Coverage.peek_result.dup
        finish_group_setup(@before_coverage)
      end

      def record_test_coverage(example)
        # Take a snapshot after each test
        after_coverage = ::Coverage.peek_result

        # Calculate which lines were executed during this test
        test_key = format_test_key(example)
        files = executed_files(@before_coverage, after_coverage)

        # Include the setup of the example's group and every group around it
        example.example_group.ancestors.each do |group|
          files.concat(@group_setup_files.fetch(group, []))
        end

        files.uniq.each { |file| @coverage_data[file][test_key] = true }
      end

      def finish_group_setup(coverage)
        return unless @setup_group

        files = executed_files(@setup_start_coverage, coverage)
        @group_setup_files[@setup_group] = files unless files.empty?
        @setup_group = nil
        @setup_start_coverage = nil
      end

      def executed_files(before_coverage, after_coverage)
        # Read Dir.pwd (a system call) once per diff, not once per file
        project_root = Dir.pwd

        after_coverage.filter_map do |file, coverage|
          # Skip files outside project scope, spec files, and rspec gem internals
          next unless in_project_scope?(file, project_root)
          next if file.end_with?('_spec.rb')

          lines = extract_lines(coverage)
          next if lines.nil?

          before_lines = extract_lines(before_coverage[file])
          # Skip unchanged files; Array#== runs in C, much faster than the loop below
          next if lines == before_lines

          # Any line whose count increased means this test executed the file.
          executed = lines.each_with_index.any? do |count, index|
            next false if count.nil?
            # Treat a missing before-count as 0 so the first render of an
            # eval'd file (e.g. a compiled template) is attributed to this test.
            before_count = before_lines ? (before_lines[index] || 0) : 0
            count > before_count
          end

          relative_path(file) if executed
        end
      end

      def write_coverage_data
        if @coverage_data.empty?
          $stdout.write("rspec-circleci-coverage: warning: no coverage data collected\n")
        end

        File.write(coverage_file, JSON.pretty_generate(@coverage_data))
        $stdout.write("rspec-circleci-coverage: wrote #{coverage_file}\n")
      end

      def coverage_file
        ENV['CIRCLECI_COVERAGE']
      end

      def format_test_key(example)
        # Examples from a shared group report the file defining the group as
        # file_path; rerun_file_path is the spec file that includes it.
        file_path = example.metadata[:rerun_file_path] || example.metadata[:file_path]
        # Clean path to remove ./ and other redundant components
        file_path = Pathname.new(file_path).cleanpath.to_s if file_path
        description = example.full_description
        "#{file_path}!!#{description}|run"
      end

      def relative_path(file)
        # Convert absolute path to relative path from current directory
        pathname = Pathname.new(file)
        pathname.absolute? ? pathname.relative_path_from(Dir.pwd).to_s : file
      end

      def in_project_scope?(file, project_root = Dir.pwd)
        # Check if file is within the project directory
        # Files outside the project (system files, gems, etc.) should be filtered out
        return false unless file.start_with?(project_root)

        # Exclude gem files (even if they're in .bundle or vendor directories)
        return false if file.include?('/gems/')
        return false if file.include?('/.bundle/')
        return false if file.include?('/vendor/')
        true
      end

      def extract_lines(coverage_value)
        case coverage_value
        when Array then coverage_value
        when Hash then coverage_value[:lines]
        else nil
        end
      end
    end
  end
end
