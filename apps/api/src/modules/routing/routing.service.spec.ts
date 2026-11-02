import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { BgpPeer } from './entities/bgp-peer.entity';
import { OspfProcess } from './entities/ospf-process.entity';
import { OspfNeighbor } from './entities/ospf-neighbor.entity';
import { RoutingConfigRevision } from './entities/routing-config-revision.entity';
import {
  RoutingVendor,
  RoutingProtocol,
  BgpPeerStatus,
} from '@netorbit/shared-types';

describe('RoutingService', () => {
  let service: RoutingService;

  const mockBgpRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((p) => Promise.resolve({ id: 'bgp-1', ...p })),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    remove: vi.fn().mockResolvedValue({}),
  };

  const mockOspfProcRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((p) => Promise.resolve({ id: 'ospf-1', ...p })),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    remove: vi.fn().mockResolvedValue({}),
  };

  const mockOspfNeighRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((n) => Promise.resolve({ id: 'neigh-1', ...n })),
    count: vi.fn().mockResolvedValue(1),
    findOne: vi.fn(),
    remove: vi.fn().mockResolvedValue({}),
  };

  const mockRevisionRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((r) => Promise.resolve({ id: 'rev-uuid-1', ...r })),
    findOne: vi.fn(),
    createQueryBuilder: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        { provide: getRepositoryToken(BgpPeer), useValue: mockBgpRepo },
        { provide: getRepositoryToken(OspfProcess), useValue: mockOspfProcRepo },
        { provide: getRepositoryToken(OspfNeighbor), useValue: mockOspfNeighRepo },
        { provide: getRepositoryToken(RoutingConfigRevision), useValue: mockRevisionRepo },
      ],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should detect and reject command injection attempts', async () => {
    const res = await service.validateConfig({
      vendor: RoutingVendor.MIKROTIK_ROUTEROS,
      protocol: RoutingProtocol.BGP,
      commands: '/routing bgp peer add; rm -rf /',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors.some((e) => e.includes('Disallowed dangerous command'))).toBe(true);
  });

  it('should reject deployment without explicit confirmation (confirmHighImpact)', async () => {
    await expect(
      service.deployConfig('tenant-1', 'admin@netorbit.local', {
        vendor: RoutingVendor.MIKROTIK_ROUTEROS,
        protocol: RoutingProtocol.BGP,
        commands: '/routing bgp connection add name=upstream remote.address=198.51.100.1 as=174',
        confirmHighImpact: false,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create BGP peer and mask MD5 credentials on response', async () => {
    const peer = await service.createBgpPeer('tenant-1', {
      name: 'Transit AS174',
      localAsn: 64512,
      remoteAsn: 174,
      peerIp: '198.51.100.1',
      md5Secret: 'VerySecretMD5',
    });

    expect(peer).toBeDefined();
    expect(peer.name).toBe('Transit AS174');
    expect(peer.status).toBe(BgpPeerStatus.ESTABLISHED);
    expect(peer.md5Secret).toBe('********');
  });

  it('should rollback to specified revision with audit diff', async () => {
    mockRevisionRepo.findOne.mockResolvedValueOnce({
      id: 'rev-target',
      tenantId: 'tenant-1',
      deviceId: 'dev-1',
      protocol: RoutingProtocol.OSPF,
      rawConfig: 'set protocols ospf area 0.0.0.0 network 10.0.0.0/24',
    });

    const rollbackResult = await service.rollbackConfig('tenant-1', 'operator@netorbit.local', {
      revisionId: 'rev-target',
      confirmHighImpact: true,
    });

    expect(rollbackResult.status).toBe('APPLIED');
    expect(rollbackResult.configValidatedLocally).toBe(true);
    expect(rollbackResult.configSentToDevice).toBe(true);
    expect(rollbackResult.routingAdjacencyEstablished).toBe(true);
  });
});
