import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RadiusMeshService } from './radius-mesh.service';
import { RadiusMeshNode } from './entities/radius-mesh-node.entity';
import { RadiusMeshEvent } from './entities/radius-mesh-event.entity';
import {
  RadiusMeshNodeStatus,
  RadiusFailoverStrategy,
} from '@netorbit/shared-types';

describe('RadiusMeshService', () => {
  let service: RadiusMeshService;

  const mockNodeRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((n) => Promise.resolve({ id: 'node-uuid-1', ...n })),
    find: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn().mockResolvedValue({}),
  };

  const mockEventRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((e) => Promise.resolve({ id: 'event-uuid-1', ...e })),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RadiusMeshService,
        { provide: getRepositoryToken(RadiusMeshNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(RadiusMeshEvent), useValue: mockEventRepo },
      ],
    }).compile();

    service = module.get<RadiusMeshService>(RadiusMeshService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a mesh node and mask the shared secret', async () => {
    mockNodeRepo.findOne.mockResolvedValueOnce(null); // not existing

    const node = await service.registerNode('tenant-1', {
      nodeId: 'node-us-east',
      name: 'US East Gateway',
      region: 'us-east',
      ipAddress: '198.51.100.25',
      sharedSecret: 'SecretMeshKey123',
    });

    expect(node).toBeDefined();
    expect(node.nodeId).toBe('node-us-east');
    expect(node.sharedSecret).toBe('********');
    expect(node.status).toBe(RadiusMeshNodeStatus.ONLINE);
  });

  it('should route auth requests according to lowest latency policy', async () => {
    mockNodeRepo.find.mockResolvedValueOnce([
      {
        id: 'node-1',
        nodeId: 'us-east-1',
        region: 'us-east',
        status: RadiusMeshNodeStatus.ONLINE,
        latencyMs: 35,
        priority: 10,
      },
      {
        id: 'node-2',
        nodeId: 'us-central-1',
        region: 'us-central',
        status: RadiusMeshNodeStatus.ONLINE,
        latencyMs: 12,
        priority: 10,
      },
    ]);

    const result = await service.forwardAuthentication('tenant-1', {
      username: 'subscriber01',
      nasIp: '10.200.0.1',
      routingPolicy: RadiusFailoverStrategy.LOWEST_LATENCY,
    });

    expect(result.forwardedToNodeId).toBe('us-central-1');
    expect(result.latencyMs).toBe(12);
    expect(result.status).toBe('SUCCESS');
  });

  it('should automatically failover when preferred region node is offline', async () => {
    mockNodeRepo.find.mockResolvedValueOnce([
      {
        id: 'node-1',
        nodeId: 'eu-west-1',
        region: 'eu-west',
        status: RadiusMeshNodeStatus.OFFLINE,
        latencyMs: 15,
        priority: 20,
      },
      {
        id: 'node-2',
        nodeId: 'us-east-backup',
        region: 'us-east',
        status: RadiusMeshNodeStatus.ONLINE,
        latencyMs: 45,
        priority: 10,
      },
    ]);

    const result = await service.forwardAuthentication('tenant-1', {
      username: 'subscriber01',
      nasIp: '10.200.0.1',
      region: 'eu-west',
      routingPolicy: RadiusFailoverStrategy.GEOGRAPHIC_AFFINITY,
    });

    expect(result.failoverOccurred).toBe(true);
    expect(result.status).toBe('FAILOVER_SUCCESS');
    expect(result.forwardedToNodeId).toBe('us-east-backup');
  });

  it('should detect duplicate accounting packets and drop them (Deduplication)', async () => {
    mockNodeRepo.find.mockResolvedValue([
      {
        id: 'node-1',
        nodeId: 'us-east-1',
        region: 'us-east',
        status: RadiusMeshNodeStatus.ONLINE,
        latencyMs: 15,
        priority: 10,
      },
    ]);

    const acctPayload = {
      sessionId: 'SESS-2026-TEST',
      acctStatusType: 'Interim-Update',
      username: 'subscriber01',
      nasIp: '10.200.0.1',
      inputOctets: 500000,
      outputOctets: 1500000,
    };

    // First arrival
    const first = await service.forwardAccounting('tenant-1', acctPayload);
    expect(first.isDuplicate).toBe(false);

    // Retransmission within 2 minutes
    const second = await service.forwardAccounting('tenant-1', acctPayload);
    expect(second.isDuplicate).toBe(true);
    expect(second.forwardedToNodeId).toBe('DEDUPLICATED');
  });
});
