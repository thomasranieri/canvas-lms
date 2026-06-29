# frozen_string_literal: true

# Allow outbound HTTP to other containers on the local network.
# Canvas blocks RFC-1918 ranges by default (SSRF protection); for
# integration testing we need LTI tool containers to be reachable.
CanvasHttp.blocked_ip_ranges = []

# Warm the persisted default shard into this process at boot.
# On a cold puma process (development = no eager load), the first requests
# can run with the in-memory Switchman::DefaultShard as Shard.current while
# records lazily resolve the persisted Shard(id:1). The identity mismatch
# makes Switchman globalize same-DB foreign keys (account 1 -> 10000000000001),
# which violates FKs like terms_of_services.account_id until the process warms.
Rails.application.config.after_initialize do
  Switchman::Shard.default(reload: true)
rescue => e
  Rails.logger.warn("[integration-test] default shard warm-up skipped: #{e.class}: #{e.message}")
end
