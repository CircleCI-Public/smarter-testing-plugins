require 'coverage'
require 'rspec'
require 'json'
require 'fileutils'
require 'open3'

# Start coverage before loading the plugin to track plugin file coverage
# This is important for test impact analysis
Coverage.start if ENV['CIRCLECI_COVERAGE']

require_relative '../../lib/rspec-circleci-coverage'

RSpec.describe 'RSpec CircleCI Coverage Integration' do
  let(:fixtures_dir) { File.expand_path('../fixtures', __dir__) }
  let(:temp_dir) { File.join(fixtures_dir, 'temp_test') }
  let(:coverage_file) { File.join(temp_dir, 'CIRCLECI_COVERAGE') }

  before(:all) do
    # Create fixtures directory structure
    @fixtures_dir = File.expand_path('../fixtures', __dir__)
    @temp_dir = File.join(@fixtures_dir, 'temp_test')
    FileUtils.mkdir_p(@temp_dir)
    FileUtils.mkdir_p(File.join(@temp_dir, 'lib'))
    FileUtils.mkdir_p(File.join(@temp_dir, 'spec'))

    # Create sample Ruby file to be tested
    File.write(File.join(@temp_dir, 'lib', 'math.rb'), <<~RUBY)
      module CircleCI
        class Math
          def add(a, b)
            a + b
          end

          def subtract(a, b)
            a - b
          end

          def multiply(a, b)
            a * b
          end

          def divide(a, b)
            raise ArgumentError, "Cannot divide by zero" if b == 0
            a / b
          end
        end
      end
    RUBY

    # Create RSpec test file
    File.write(File.join(@temp_dir, 'spec', 'math_spec.rb'), <<~RUBY)
      require_relative '../lib/math'

      RSpec.describe Math do
        let(:math) { CircleCI::Math.new }

        it 'adds two numbers' do
          result = math.add(2, 3)
          expect(result).to eq(5)
        end

        it 'subtracts two numbers' do
          result = math.subtract(5, 3)
          expect(result).to eq(2)
        end

        it 'multiplies two numbers' do
          result = math.multiply(4, 5)
          expect(result).to eq(20)
        end

        it 'divides two numbers' do
          result = math.divide(10, 2)
          expect(result).to eq(5)
        end
      end
    RUBY

    File.write(File.join(@temp_dir, 'spec', 'math2_spec.rb'), <<~RUBY)
      require_relative '../lib/math'

      RSpec.describe 'Math2' do
        let(:math) { CircleCI::Math.new }
        it 'adds and multiplies two numbers' do
          result = math.multiply(math.add(1, 2), 2)
          expect(result).to eq(6)
        end
      end
    RUBY

    # Create spec_helper that requires our plugin
    File.write(File.join(@temp_dir, 'spec', 'spec_helper.rb'), <<~RUBY)
      require_relative '../../../../lib/rspec-circleci-coverage'
    RUBY
  end

  after(:all) do
    # Clean up temp directory
    FileUtils.rm_rf(@temp_dir) if @temp_dir && File.exist?(@temp_dir)
  end

  it 'generates CIRCLECI_COVERAGE file with correct schema' do
    # Run RSpec in the temp directory
    Dir.chdir(temp_dir) do
      # Delete any existing coverage file
      File.delete(coverage_file) if File.exist?(coverage_file)

      # Run RSpec with our plugin
      stdout, stderr, status = Open3.capture3(
        { 'CIRCLECI_COVERAGE' => coverage_file },
        'rspec',
        '--require', './spec/spec_helper.rb',
        'spec/math_spec.rb',
        'spec/math2_spec.rb'
      )

      # Verify RSpec ran successfully
      expect(status.success?).to be(true), "RSpec failed: #{stderr}\n#{stdout}"

      # Verify coverage file was created
      expect(File.exist?(coverage_file)).to be(true), 'CIRCLECI_COVERAGE file was not created'

      # Read and parse the coverage file
      coverage_data = JSON.parse(File.read(coverage_file))

      # Expected coverage structure with relative paths
      # Paths are relative to the temp_dir where tests are run
      # Only method bodies are tracked (not class/method definitions)
      expected_coverage = {
        "lib/math.rb" => {
          "spec/math_spec.rb::Math adds two numbers|run" => [4],
          "spec/math_spec.rb::Math subtracts two numbers|run" => [8],
          "spec/math_spec.rb::Math multiplies two numbers|run" => [12],
          "spec/math_spec.rb::Math divides two numbers|run" => [16, 17],
          "spec/math2_spec.rb::Math2 adds and multiplies two numbers|run" => [4, 12],
        },
      }

      # Verify exact structure matches expected
      expect(coverage_data).to eq(expected_coverage)
    end
  end

  it 'should not produce output or capture coverage when disabled' do
    # Run RSpec in the temp directory
    Dir.chdir(temp_dir) do
      # Delete any existing coverage file
      File.delete(coverage_file) if File.exist?(coverage_file)

      # Run RSpec with our plugin
      stdout, stderr, status = Open3.capture3(
        'rspec',
        '--require', './spec/spec_helper.rb',
        'spec/math_spec.rb',
        'spec/math2_spec.rb'
      )

      # Verify RSpec ran successfully
      expect(status.success?).to be(true), "RSpec failed: #{stderr}\n#{stdout}"

      # Verify coverage file was created
      expect(File.exist?(coverage_file)).to be(false), 'CIRCLECI_COVERAGE file was not created'
    end
  end
end
