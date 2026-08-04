Gem::Specification.new do |spec|
  spec.name = "rspec-circleci-coverage"
  spec.version = "0.1.0"
  spec.authors = ["CircleCI"]
  spec.license = "MIT"
  spec.summary = "An RSpec plugin that generates coverage data for CircleCI's Smarter Testing"
  spec.homepage = "https://github.com/CircleCI-Public/smarter-testing-plugins"
  spec.metadata = {
    "source_code_uri" => spec.homepage,
    "allowed_push_host" => "https://rubygems.org",
  }
  spec.files = Dir["lib/**/*.rb", "README.md", "LICENSE"]
  spec.require_paths = ["lib"]
  spec.required_ruby_version = ">= 3.2"
  spec.add_dependency "rspec-core", "~> 3.13"
end
