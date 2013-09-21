require 'rubygems'
require 'bundler/setup'
require 'puma'
require 'rack/proxy'
require 'rack/test'

require File.expand_path('../../lib/faye', __FILE__)
require File.expand_path('../../vendor/em-rspec/lib/em-rspec', __FILE__)

require 'ruby/encoding_helper'
require 'ruby/server_proxy'
require 'ruby/engine_examples'

class EnvelopeMatcher
  def initialize(message)
    @message = message
  end

  def ==(other)
    Faye::Envelope === other and @message == other.message
  end
end

