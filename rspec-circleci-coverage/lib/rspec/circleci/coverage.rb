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
        @installed = false
      end

      def install
        return if @installed
        @installed = true

        # Start coverage tracking if not already running
        unless ::Coverage.running?
          ::Coverage.start
        end

        coverage_instance = self

        # Hook into RSpec lifecycle
        RSpec.configure do |config|
          config.before(:suite) do
            $stdout.write("rspec-circleci-coverage: generating CircleCI coverage JSON...\n")
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

      def capture_coverage
        @before_coverage = ::Coverage.peek_result.dup
      end

      def record_test_coverage(example)
        # Take a snapshot after each test
        after_coverage = ::Coverage.peek_result

        # Calculate which lines were executed during this test
        test_key = format_test_key(example)

        after_coverage.each do |file, lines|
          # Skip files outside project scope, spec files, and rspec gem internals
          next unless in_project_scope?(file)
          next if file.end_with?('_spec.rb')
          next if lines.nil?

          # Extract the actual lines array from the coverage result
          next if lines.nil?

          before_coverage_lines = @before_coverage[file]
          next if before_coverage_lines.nil?

          # Find lines that were executed during this test
          executed_lines = []
          lines.each_with_index do |count, index|
            next if count.nil?
            before_count = before_coverage_lines[index]
            next if before_count.nil?

            # Line was executed if count increased
            if count > before_count
              executed_lines << (index + 1) # Line numbers are 1-indexed
            end
          end

          # Only add if lines were executed
          if executed_lines.any?
            relative_file = relative_path(file)
            @coverage_data[relative_file][test_key] = executed_lines
          end
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
        file_path = example.metadata[:file_path]
        # Clean path to remove ./ and other redundant components
        file_path = Pathname.new(file_path).cleanpath.to_s if file_path
        description = example.full_description
        "#{file_path}::#{description}|run"
      end

      def relative_path(file)
        # Convert absolute path to relative path from current directory
        pathname = Pathname.new(file)
        pathname.absolute? ? pathname.relative_path_from(Dir.pwd).to_s : file
      end

      def in_project_scope?(file)
        # Check if file is within the project directory
        # Files outside the project (system files, gems, etc.) should be filtered out
        return false unless file.start_with?(Dir.pwd)

        # Exclude gem files (even if they're in .bundle or vendor directories)
        return false if file.include?('/gems/')
        return false if file.include?('/.bundle/')
        return false if file.include?('/vendor/')
        true
      end
    end
  end
end
