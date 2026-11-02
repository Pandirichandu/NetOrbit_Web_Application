import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SnmpService } from './snmp.service';
import { SnmpDevice } from './entities/snmp-device.entity';
import { NetworkInterface } from './entities/network-interface.entity';
import { TopologyLink } from './entities/topology-link.entity';
import { SnmpPollLog } from './entities/snmp-poll-log.entity';
import { SnmpVersion } from '@netorbit/shared-types';

describe('SnmpService', () => {
  let service: SnmpService;

  const mockDeviceRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((d) => Promise.resolve({ id: 'dev-uuid-1', ...d })),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockInterfaceRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((i) => Promise.resolve({ id: 'if-uuid-1', ...i })),
    find: vi.fn().mockResolvedValue([]),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    }),
  };

  const mockLinkRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((l) => Promise.resolve({ id: 'link-uuid-1', ...l })),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockLogRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((l) => Promise.resolve({ id: 'log-uuid-1', ...l })),
    find: vi.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnmpService,
        { provide: getRepositoryToken(SnmpDevice), useValue: mockDeviceRepo },
        { provide: getRepositoryToken(NetworkInterface), useValue: mockInterfaceRepo },
        { provide: getRepositoryToken(TopologyLink), useValue: mockLinkRepo },
        { provide: getRepositoryToken(SnmpPollLog), useValue: mockLogRepo },
      ],
    }).compile();

    service = module.get<SnmpService>(SnmpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject loopback and AWS metadata IPs (Anti-SSRF)', async () => {
    await expect(
      service.registerDevice(
        {
          name: 'Dangerous Target',
          ipAddress: '127.0.0.1',
          version: SnmpVersion.V2C,
        },
        'tenant-1',
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.registerDevice(
        {
          name: 'Metadata Target',
          ipAddress: '169.254.169.254',
          version: SnmpVersion.V2C,
        },
        'tenant-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should encrypt community credentials and mask them on retrieval', async () => {
    mockDeviceRepo.findOne.mockResolvedValueOnce({
      id: 'dev-1',
      tenantId: 'tenant-1',
      name: 'Edge Router',
      ipAddress: '10.200.1.1',
      communityString: 'encrypted_secret_hash',
      interfaces: [],
      pollLogs: [],
    });

    const device = await service.findOneDevice('dev-1', 'tenant-1');
    expect(device).toBeDefined();
    expect(device.name).toBe('Edge Router');
    // Secret must be masked, not plain text
    expect(device.communityString).toContain('****');
    expect(device.communityString).not.toBe('encrypted_secret_hash');
  });

  it('should calculate topology nodes and edges accurately', async () => {
    mockDeviceRepo.find.mockResolvedValueOnce([
      {
        id: 'dev-1',
        name: 'Core-Router',
        ipAddress: '10.0.0.1',
        vendor: 'MikroTik',
        model: 'CCR2004',
        status: 'ONLINE',
        interfaces: [{ id: 'if-1' }, { id: 'if-2' }],
      },
      {
        id: 'dev-2',
        name: 'Distribution-Switch',
        ipAddress: '10.0.0.2',
        vendor: 'Cisco',
        model: 'Catalyst 3850',
        status: 'ONLINE',
        interfaces: [{ id: 'if-3' }],
      },
    ]);

    mockLinkRepo.find.mockResolvedValueOnce([
      {
        id: 'link-1',
        sourceDeviceId: 'dev-1',
        sourceDevice: { name: 'Core-Router' },
        sourceInterface: { name: 'sfp-plus1' },
        targetDeviceId: 'dev-2',
        targetDevice: { name: 'Distribution-Switch' },
        targetInterface: { name: 'TenGig0/1' },
        speedBps: 10000000000,
        linkType: 'LLDP',
        status: 'UP',
      },
    ]);

    const topology = await service.getTopology('tenant-1');
    expect(topology.totalDevices).toBe(2);
    expect(topology.totalLinks).toBe(1);
    expect(topology.nodes[0].label).toBe('Core-Router');
    expect(topology.edges[0].speedGbps).toBe('10 Gbps');
  });
});
