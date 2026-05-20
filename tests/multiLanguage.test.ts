import { describe, it, expect } from 'vitest';
import { 
  parseCargoTomlContent, 
  parsePyProjectTomlContent, 
  parseRequirementsTxtContent, 
  parseGoModContent,
  parseComposerJsonContent,
  parsePomXmlContent,
  parseGemfileContent
} from '../src/scanners/projectScanner.js';

describe('Multi-Language Manifest Parsers', () => {
  describe('parseCargoTomlContent', () => {
    it('should parse Rust package info and dependencies correctly', () => {
      const content = `
[package]
name = "my-rust-app"
version = "0.2.1"
description = "A premium Rust app"
edition = "2021"

[dependencies]
tokio = { version = "1.28", features = ["full"] }
serde = "1.0"
serde_json = "1.0"

[dev-dependencies]
tokio-test = "0.4"
`;
      const result = parseCargoTomlContent(content);
      
      expect(result.name).toBe('my-rust-app');
      expect(result.version).toBe('0.2.1');
      expect(result.description).toBe('A premium Rust app');
      expect(result.dependencies).toContain('tokio');
      expect(result.dependencies).toContain('serde');
      expect(result.dependencies).toContain('serde_json');
      expect(result.devDependencies).toContain('tokio-test');
    });
  });

  describe('parsePyProjectTomlContent', () => {
    it('should parse Python project info and dependencies correctly', () => {
      const content = `
[project]
name = "my-py-app"
version = "1.4.0"
description = "Beautiful Python App"
dependencies = [
    "requests>=2.25",
    "flask",
    "gunicorn"
]
`;
      const result = parsePyProjectTomlContent(content);
      
      expect(result.name).toBe('my-py-app');
      expect(result.version).toBe('1.4.0');
      expect(result.description).toBe('Beautiful Python App');
      expect(result.dependencies).toContain('requests');
      expect(result.dependencies).toContain('flask');
      expect(result.dependencies).toContain('gunicorn');
    });
  });

  describe('parseRequirementsTxtContent', () => {
    it('should parse requirements.txt packages ignoring versions and comments', () => {
      const content = `
# Core packages
requests==2.26.0
flask>=2.0.0
pytest<=6.2.5; python_version > '3.6'
# Deployment
gunicorn
`;
      const result = parseRequirementsTxtContent(content);
      
      expect(result).toHaveLength(4);
      expect(result).toContain('requests');
      expect(result).toContain('flask');
      expect(result).toContain('pytest');
      expect(result).toContain('gunicorn');
    });
  });

  describe('parseGoModContent', () => {
    it('should parse Go module name and packages correctly', () => {
      const content = `
module github.com/user/my-go-app

go 1.20

require (
	github.com/gin-gonic/gin v1.9.0
	github.com/spf13/cobra v1.7.0
)

require github.com/mattn/go-isatty v0.0.19 // indirect
`;
      const result = parseGoModContent(content);
      
      expect(result.name).toBe('github.com/user/my-go-app');
      expect(result.dependencies).toContain('github.com/gin-gonic/gin');
      expect(result.dependencies).toContain('github.com/spf13/cobra');
      expect(result.dependencies).toContain('github.com/mattn/go-isatty');
    });
  });

  describe('parseComposerJsonContent', () => {
    it('should parse PHP composer.json project info and dependencies correctly', () => {
      const content = JSON.stringify({
        name: 'vendor/my-php-app',
        version: '2.1.0',
        description: 'A PHP web application',
        require: {
          php: '^8.1',
          'ext-json': '*',
          'laravel/framework': '^10.0',
          'guzzlehttp/guzzle': '^7.5'
        },
        'require-dev': {
          'phpunit/phpunit': '^10.0',
          'laravel/pint': '^1.0'
        }
      });

      const result = parseComposerJsonContent(content);

      expect(result.name).toBe('vendor/my-php-app');
      expect(result.version).toBe('2.1.0');
      expect(result.description).toBe('A PHP web application');
      // php and ext- entries should be filtered out
      expect(result.dependencies).not.toContain('php');
      expect(result.dependencies).not.toContain('ext-json');
      expect(result.dependencies).toContain('laravel/framework');
      expect(result.dependencies).toContain('guzzlehttp/guzzle');
      expect(result.devDependencies).toContain('phpunit/phpunit');
      expect(result.devDependencies).toContain('laravel/pint');
    });
  });

  describe('parsePomXmlContent', () => {
    it('should parse Java/Maven pom.xml project info and dependencies correctly', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <groupId>com.example</groupId>
  <artifactId>my-java-app</artifactId>
  <version>3.0.1</version>
  <description>A Spring Boot application</description>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
      <version>31.1-jre</version>
    </dependency>
  </dependencies>
</project>`;

      const result = parsePomXmlContent(content);

      expect(result.name).toBe('my-java-app');
      expect(result.version).toBe('3.0.1');
      expect(result.description).toBe('A Spring Boot application');
      expect(result.dependencies).toContain('spring-boot-starter-web');
      expect(result.dependencies).toContain('guava');
    });
  });

  describe('parseGemfileContent', () => {
    it('should parse Ruby Gemfile gem names correctly, ignoring comments', () => {
      const content = `
source 'https://rubygems.org'

# Core gems
gem 'rails', '~> 7.0'
gem 'puma', '>= 5.0'
gem "pg"

group :development, :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
end
`;
      const result = parseGemfileContent(content);

      expect(result.dependencies).toContain('rails');
      expect(result.dependencies).toContain('puma');
      expect(result.dependencies).toContain('pg');
      expect(result.dependencies).toContain('rspec-rails');
      expect(result.dependencies).toContain('factory_bot_rails');
      expect(result.dependencies).toHaveLength(5);
    });
  });
});
