Gem::Specification.new do |spec|
  spec.name = "rspec-circleci-coverage"
  spec.version = "0.1.0"
  spec.authors = ["CircleCI"]
  spec.license = "MIT"
  spec.summary = "An RSpec plugin that generates coverage data for CircleCI's Smarter Testing"
  spec.homepage = "https://github.com/circleci/rspec-circleci-coverage"
  spec.files = Dir["lib/**/*.rb", "README.md"]
  spec.require_paths = ["lib"]
  spec.add_dependency "rspec-core", "~> 3.13"
end
