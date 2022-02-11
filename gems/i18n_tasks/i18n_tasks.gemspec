# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "i18n_tasks"
  spec.version       = "0.0.1"
  spec.authors       = ["Raphael Weiner", "Stephan Hagemann"]
  spec.email         = ["rweiner@pivotallabs.com", "stephan@pivotallabs.com"]
  spec.summary       = "Instructure i18n tasks gem"

  spec.files         = Dir.glob("{lib,spec}/**/*") + %w[Rakefile test.sh]
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_dependency "activesupport", ">= 3.2"

  spec.add_dependency "i18n", ">= 0.7", "< 2"
  spec.add_dependency "i18n_extraction"
  spec.add_dependency "ruby_parser", "~> 3.7"
  spec.add_dependency "utf8_cleaner"

  spec.add_development_dependency "bundler", "~> 2.2"
  spec.add_development_dependency "rake"
  spec.add_development_dependency "rspec", "~> 3.5.0"
end
