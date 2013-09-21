var EnvelopeMatcher = function(message) {
  this.message = message
}
EnvelopeMatcher.prototype.equals = function(other) {
  return (other instanceof Faye.Envelope) && JS.Enumerable.areEqual(this.message, other.message)
}

JS.ENV.TransportSpec = JS.Test.describe("Transport", function() { with(this) {
  before(function() { with(this) {
    this.client = {
      endpoint:       Faye.URI.parse("http://example.com/"),
      endpoints:      {},
      maxRequestSize: 2048,
      headers:        {},
      transports:     {}
    }

    if (Faye.Transport.NodeLocal) {
      this.LocalTransport = Faye.Transport.NodeLocal
      this.HttpTransport  = Faye.Transport.NodeHttp
      this.inProcess      = "in-process"
      this.longPolling    = "long-polling"
    } else {
      this.LocalTransport = Faye.Transport.WebSocket
      this.HttpTransport  = Faye.Transport.XHR
      this.inProcess      = "websocket"
      this.longPolling    = "long-polling"
    }
  }})

  describe("get", function() { with(this) {
    before(function() { with(this) {
      stub(HttpTransport, "isUsable").yields([false])
      stub(LocalTransport, "isUsable").yields([false])
    }})

    describe("when no transport is usable", function() { with(this) {
      it("raises an exception", function() { with(this) {
        assertThrows(Error, function() { Faye.Transport.get(client, [longPolling, inProcess], []) })
      }})
    }})

    describe("when a less preferred transport is usable", function() { with(this) {
      before(function() { with(this) {
        stub(HttpTransport, "isUsable").yields([true])
      }})

      it("returns a transport of the usable type", function() { with(this) {
        Faye.Transport.get(client, [longPolling, inProcess], [], function(transport) {
          assertKindOf( HttpTransport, transport )
        })
      }})

      it("raises an exception if the usable type is not requested", function() { with(this) {
        assertThrows(Error, function() { Faye.Transport.get(client, [inProcess], []) })
      }})

      it("allows the usable type to be specifically selected", function() { with(this) {
        Faye.Transport.get(client, [longPolling], [], function(transport) {
          assertKindOf( HttpTransport, transport )
        })
      }})
    }})

    describe("when all transports are usable", function() { with(this) {
      before(function() { with(this) {
        stub(LocalTransport, "isUsable").yields([true])
        stub(HttpTransport, "isUsable").yields([true])
      }})

      it("returns the most preferred type", function() { with(this) {
        Faye.Transport.get(client, [longPolling, inProcess], [], function(transport) {
          assertKindOf( LocalTransport, transport )
        })
      }})

      it("allows types to be specifically selected", function() { with(this) {
        Faye.Transport.get(client, [inProcess], [], function(transport) {
          assertKindOf( LocalTransport, transport )
        })
        Faye.Transport.get(client, [longPolling], [], function(transport) {
          assertKindOf( HttpTransport, transport )
        })
      }})
    }})
  }})

  describe("send", function() { with(this) {
    include(JS.Test.FakeClock)
    before(function() { this.clock.stub() })
    after(function() { this.clock.reset() })

    define("envelope", function(message) {
      return new EnvelopeMatcher(message)
    })

    define("send", function(message) {
      this.transport.send(new Faye.Envelope(message))
    })

    describe("for batching transports", function() { with(this) {
      before(function() { with(this) {
        this.Transport = Faye.Class(Faye.Transport, {batching: true})
        this.transport = new Transport(client, client.endpoint)
      }})

      it("does not make an immediate request", function() { with(this) {
        expect(transport, "request").exactly(0)
        send({batch: "me"})
      }})

      it("queues the message to be sent after a timeout", function() { with(this) {
        expect(transport, "request").given([envelope({batch: "me"})])
        send({batch: "me"})
        clock.tick(10)
      }})

      it("allows multiple messages to be batched together", function() { with(this) {
        expect(transport, "request").given([envelope({id: 1}), envelope({id: 2})])
        send({id: 1})
        send({id: 2})
        clock.tick(10)
      }})

      it("adds advice to connect messages sent with others", function() { with(this) {
        expect(transport, "request").given([envelope({channel: "/meta/connect", advice: {timeout: 0}}), envelope({})])
        send({channel: "/meta/connect"})
        send({})
        clock.tick(10)
      }})

      it("adds no advice to connect messages sent alone", function() { with(this) {
        expect(transport, "request").given([envelope({channel: "/meta/connect"})])
        send({channel: "/meta/connect"})
        clock.tick(10)
      }})
    }})

    describe("for non-batching transports", function() { with(this) {
      before(function() { with(this) {
        this.Transport = Faye.Class(Faye.Transport, {batching: false})
        this.transport = new Transport(client, client.endpoint)
      }})

      it("makes a request immediately", function() { with(this) {
        expect(transport, "request").given([envelope({no: "batch"})])
        send({no: "batch"})
      }})
    }})
  }})
}})
