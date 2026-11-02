import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6AdvancedNetworkOperations1710000005000 implements MigrationInterface {
  name = 'Phase6AdvancedNetworkOperations1710000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. SNMP Devices Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "snmp_devices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "name" varchar(150) NOT NULL,
        "ip_address" varchar(45) NOT NULL,
        "port" int NOT NULL DEFAULT 161,
        "version" varchar(20) NOT NULL DEFAULT 'v2c',
        "community_string" varchar(255),
        "v3_user" varchar(100),
        "v3_security_level" varchar(30),
        "v3_auth_protocol" varchar(20),
        "v3_auth_key" varchar(255),
        "v3_priv_protocol" varchar(20),
        "v3_priv_key" varchar(255),
        "vendor" varchar(100) NOT NULL DEFAULT 'Generic',
        "model" varchar(100) NOT NULL DEFAULT 'Network Device',
        "sys_name" varchar(255),
        "sys_descr" text,
        "sys_location" varchar(255),
        "uptime_seconds" bigint NOT NULL DEFAULT 0,
        "status" varchar(30) NOT NULL DEFAULT 'ONLINE',
        "polling_interval_seconds" int NOT NULL DEFAULT 60,
        "last_polled_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_snmp_devices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_snmp_devices_tenant_ip" UNIQUE ("tenant_id", "ip_address")
      );
      CREATE INDEX IF NOT EXISTS "IDX_snmp_devices_tenant_id" ON "snmp_devices" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_snmp_devices_ip_address" ON "snmp_devices" ("ip_address");
      CREATE INDEX IF NOT EXISTS "IDX_snmp_devices_status" ON "snmp_devices" ("status");
    `);

    // 2. Network Interfaces Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "network_interfaces" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "device_id" uuid NOT NULL,
        "if_index" int NOT NULL,
        "name" varchar(150) NOT NULL,
        "alias" varchar(255),
        "mac_address" varchar(50),
        "admin_status" varchar(20) NOT NULL DEFAULT 'UP',
        "oper_status" varchar(20) NOT NULL DEFAULT 'UP',
        "speed_bps" bigint NOT NULL DEFAULT 1000000000,
        "in_octets" bigint NOT NULL DEFAULT 0,
        "out_octets" bigint NOT NULL DEFAULT 0,
        "in_errors" bigint NOT NULL DEFAULT 0,
        "out_errors" bigint NOT NULL DEFAULT 0,
        "last_polled_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "FK_network_interfaces_device" FOREIGN KEY ("device_id") REFERENCES "snmp_devices" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_network_interfaces_device_index" UNIQUE ("device_id", "if_index")
      );
      CREATE INDEX IF NOT EXISTS "IDX_network_interfaces_device_id" ON "network_interfaces" ("device_id");
    `);

    // 3. Topology Links Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "topology_links" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "source_device_id" uuid NOT NULL,
        "source_interface_id" uuid,
        "target_device_id" uuid NOT NULL,
        "target_interface_id" uuid,
        "link_type" varchar(30) NOT NULL DEFAULT 'LLDP',
        "speed_bps" bigint NOT NULL DEFAULT 1000000000,
        "status" varchar(20) NOT NULL DEFAULT 'UP',
        "last_discovered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_topology_links_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_topology_links_source_device" FOREIGN KEY ("source_device_id") REFERENCES "snmp_devices" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_topology_links_target_device" FOREIGN KEY ("target_device_id") REFERENCES "snmp_devices" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_topology_links_source_if" FOREIGN KEY ("source_interface_id") REFERENCES "network_interfaces" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_topology_links_target_if" FOREIGN KEY ("target_interface_id") REFERENCES "network_interfaces" ("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_topology_links_tenant_id" ON "topology_links" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_topology_links_source_device" ON "topology_links" ("source_device_id");
      CREATE INDEX IF NOT EXISTS "IDX_topology_links_target_device" ON "topology_links" ("target_device_id");
    `);

    // 4. SNMP Poll Logs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "snmp_poll_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "device_id" uuid NOT NULL,
        "response_time_ms" int NOT NULL DEFAULT 0,
        "status" varchar(30) NOT NULL DEFAULT 'ONLINE',
        "error_message" text,
        "metrics_snapshot" jsonb,
        "polled_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_snmp_poll_logs_device" FOREIGN KEY ("device_id") REFERENCES "snmp_devices" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_snmp_poll_logs_device_id" ON "snmp_poll_logs" ("device_id");
      CREATE INDEX IF NOT EXISTS "IDX_snmp_poll_logs_polled_at" ON "snmp_poll_logs" ("polled_at");
    `);

    // 5. BGP Peers Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bgp_peers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "device_id" uuid,
        "name" varchar(150) NOT NULL,
        "description" text,
        "local_asn" bigint NOT NULL,
        "remote_asn" bigint NOT NULL,
        "peer_ip" varchar(45) NOT NULL,
        "md5_secret" varchar(255),
        "status" varchar(30) NOT NULL DEFAULT 'ESTABLISHED',
        "prefixes_received" int NOT NULL DEFAULT 0,
        "prefixes_advertised" int NOT NULL DEFAULT 0,
        "uptime_seconds" bigint NOT NULL DEFAULT 0,
        "last_error" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_bgp_peers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_bgp_peers_tenant_peer_ip" UNIQUE ("tenant_id", "peer_ip")
      );
      CREATE INDEX IF NOT EXISTS "IDX_bgp_peers_tenant_id" ON "bgp_peers" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_bgp_peers_status" ON "bgp_peers" ("status");
    `);

    // 6. OSPF Processes Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ospf_processes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "device_id" uuid,
        "process_id" int NOT NULL DEFAULT 1,
        "router_id" varchar(45) NOT NULL,
        "area_id" varchar(45) NOT NULL DEFAULT '0.0.0.0',
        "auth_type" varchar(20) NOT NULL DEFAULT 'NONE',
        "status" varchar(30) NOT NULL DEFAULT 'RUNNING',
        "interfaces_count" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_ospf_processes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_ospf_processes_tenant_proc" UNIQUE ("tenant_id", "process_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_ospf_processes_tenant_id" ON "ospf_processes" ("tenant_id");
    `);

    // 7. OSPF Neighbors Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ospf_neighbors" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "process_id" uuid NOT NULL,
        "neighbor_id" varchar(45) NOT NULL,
        "ip_address" varchar(45) NOT NULL,
        "interface_name" varchar(100) NOT NULL,
        "state" varchar(30) NOT NULL DEFAULT 'FULL',
        "priority" int NOT NULL DEFAULT 1,
        "dead_time_seconds" int NOT NULL DEFAULT 35,
        CONSTRAINT "FK_ospf_neighbors_process" FOREIGN KEY ("process_id") REFERENCES "ospf_processes" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_ospf_neighbors_process_id" ON "ospf_neighbors" ("process_id");
    `);

    // 8. Routing Config Revisions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "routing_config_revisions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "device_id" uuid NOT NULL,
        "protocol" varchar(20) NOT NULL,
        "raw_config" text NOT NULL,
        "applied_diff" text,
        "deployed_by" varchar(150) NOT NULL,
        "deployed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "rollback_target_id" uuid,
        "status" varchar(30) NOT NULL DEFAULT 'APPLIED',
        CONSTRAINT "FK_routing_revisions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_routing_revisions_tenant_id" ON "routing_config_revisions" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_routing_revisions_device_id" ON "routing_config_revisions" ("device_id");
    `);

    // 9. RADIUS Mesh Nodes Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "radius_mesh_nodes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "node_id" varchar(100) NOT NULL,
        "name" varchar(150) NOT NULL,
        "region" varchar(100) NOT NULL,
        "ip_address" varchar(45) NOT NULL,
        "auth_port" int NOT NULL DEFAULT 1812,
        "acct_port" int NOT NULL DEFAULT 1813,
        "coa_port" int NOT NULL DEFAULT 3799,
        "shared_secret" varchar(255) NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'ONLINE',
        "role" varchar(30) NOT NULL DEFAULT 'PRIMARY',
        "priority" int NOT NULL DEFAULT 10,
        "latency_ms" int NOT NULL DEFAULT 15,
        "load_factor" numeric(5, 2) NOT NULL DEFAULT 0.15,
        "active_sessions_count" int NOT NULL DEFAULT 0,
        "last_heartbeat_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_radius_mesh_nodes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_radius_mesh_nodes_tenant_node" UNIQUE ("tenant_id", "node_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_radius_mesh_nodes_tenant_id" ON "radius_mesh_nodes" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_radius_mesh_nodes_status" ON "radius_mesh_nodes" ("status");
    `);

    // 10. RADIUS Mesh Events Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "radius_mesh_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "node_id" uuid NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "session_id" varchar(100),
        "username" varchar(150),
        "details" text,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_radius_mesh_events_node" FOREIGN KEY ("node_id") REFERENCES "radius_mesh_nodes" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_radius_mesh_events_node_id" ON "radius_mesh_events" ("node_id");
      CREATE INDEX IF NOT EXISTS "IDX_radius_mesh_events_event_type" ON "radius_mesh_events" ("event_type");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "radius_mesh_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "radius_mesh_nodes" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "routing_config_revisions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ospf_neighbors" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ospf_processes" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bgp_peers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "snmp_poll_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "topology_links" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "network_interfaces" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "snmp_devices" CASCADE;`);
  }
}
