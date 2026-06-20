# frozen_string_literal: true

# Allow outbound HTTP to other containers on the local network.
# Canvas blocks RFC-1918 ranges by default (SSRF protection); for
# integration testing we need LTI tool containers to be reachable.
CanvasHttp.blocked_ip_ranges = []
