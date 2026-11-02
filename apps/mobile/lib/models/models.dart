class UserModel {
  final String id;
  final String email;
  final String name;
  final String role;
  final String? tenantId;
  final String? tenantName;
  final String? tenantSlug;
  final String? customerId;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.tenantId,
    this.tenantName,
    this.tenantSlug,
    this.customerId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? 'CUSTOMER',
      tenantId: json['tenantId'],
      tenantName: json['tenantName'],
      tenantSlug: json['tenantSlug'],
      customerId: json['customerId'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'tenantId': tenantId,
        'tenantName': tenantName,
        'tenantSlug': tenantSlug,
        'customerId': customerId,
      };

  bool get isCustomer => role == 'CUSTOMER';
  bool get isSuperAdmin => role == 'SUPER_ADMIN';
}

class SubscriberModel {
  final String id;
  final String username;
  final String name;
  final String mobile;
  final String? email;
  final String? staticIp;
  final String? macAddress;
  final int downloadSpeedLimit;
  final int uploadSpeedLimit;
  final dynamic totalDownloadBytes;
  final dynamic totalUploadBytes;
  final String status;
  final String? startDate;
  final String? expiryDate;
  final PackageModel? package;
  final List<ActiveSessionModel>? activeSessions;
  final List<InvoiceModel>? invoices;

  SubscriberModel({
    required this.id,
    required this.username,
    required this.name,
    required this.mobile,
    this.email,
    this.staticIp,
    this.macAddress,
    this.downloadSpeedLimit = 100,
    this.uploadSpeedLimit = 100,
    this.totalDownloadBytes = 0,
    this.totalUploadBytes = 0,
    required this.status,
    this.startDate,
    this.expiryDate,
    this.package,
    this.activeSessions,
    this.invoices,
  });

  factory SubscriberModel.fromJson(Map<String, dynamic> json) {
    return SubscriberModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      name: json['name'] ?? json['customer']?['name'] ?? '',
      mobile: json['mobile'] ?? json['customer']?['mobile'] ?? '',
      email: json['email'] ?? json['customer']?['email'],
      staticIp: json['staticIp'],
      macAddress: json['macAddress'],
      downloadSpeedLimit: json['downloadSpeedLimit'] ?? 100,
      uploadSpeedLimit: json['uploadSpeedLimit'] ?? 100,
      totalDownloadBytes: json['totalDownloadBytes'] ?? 0,
      totalUploadBytes: json['totalUploadBytes'] ?? 0,
      status: json['status'] ?? 'ACTIVE',
      startDate: json['startDate'],
      expiryDate: json['expiryDate'],
      package: json['package'] != null ? PackageModel.fromJson(json['package']) : null,
      activeSessions: (json['activeSessions'] as List<dynamic>?)
          ?.map((s) => ActiveSessionModel.fromJson(s))
          .toList(),
      invoices: (json['invoices'] as List<dynamic>?)
          ?.map((i) => InvoiceModel.fromJson(i))
          .toList(),
    );
  }
}

class PackageModel {
  final String id;
  final String name;
  final String code;
  final String? description;
  final dynamic monthlyPrice;
  final int validityDays;
  final int downloadSpeed;
  final int uploadSpeed;
  final bool fupEnabled;
  final String status;

  PackageModel({
    required this.id,
    required this.name,
    required this.code,
    this.description,
    required this.monthlyPrice,
    this.validityDays = 30,
    this.downloadSpeed = 100,
    this.uploadSpeed = 100,
    this.fupEnabled = false,
    this.status = 'ACTIVE',
  });

  factory PackageModel.fromJson(Map<String, dynamic> json) {
    return PackageModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      code: json['code'] ?? '',
      description: json['description'],
      monthlyPrice: json['monthlyPrice'] ?? 0,
      validityDays: json['validityDays'] ?? 30,
      downloadSpeed: json['downloadSpeed'] ?? 100,
      uploadSpeed: json['uploadSpeed'] ?? 100,
      fupEnabled: json['fupEnabled'] ?? false,
      status: json['status'] ?? 'ACTIVE',
    );
  }
}

class InvoiceModel {
  final String id;
  final String invoiceNumber;
  final dynamic subtotal;
  final dynamic taxTotal;
  final dynamic total;
  final String status;
  final String? issueDate;
  final String? dueDate;
  final String? paidAt;
  final Map<String, dynamic>? customer;
  final List<dynamic>? items;

  InvoiceModel({
    required this.id,
    required this.invoiceNumber,
    required this.subtotal,
    required this.taxTotal,
    required this.total,
    required this.status,
    this.issueDate,
    this.dueDate,
    this.paidAt,
    this.customer,
    this.items,
  });

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    return InvoiceModel(
      id: json['id'] ?? '',
      invoiceNumber: json['invoiceNumber'] ?? '',
      subtotal: json['subtotal'] ?? 0,
      taxTotal: json['taxTotal'] ?? 0,
      total: json['total'] ?? 0,
      status: json['status'] ?? 'PENDING',
      issueDate: json['issueDate'],
      dueDate: json['dueDate'],
      paidAt: json['paidAt'],
      customer: json['customer'],
      items: json['items'],
    );
  }
}

class PaymentModel {
  final String id;
  final String paymentNumber;
  final dynamic amount;
  final String method;
  final String status;
  final String? gatewayTxnId;
  final String? paidAt;
  final Map<String, dynamic>? customer;

  PaymentModel({
    required this.id,
    required this.paymentNumber,
    required this.amount,
    required this.method,
    required this.status,
    this.gatewayTxnId,
    this.paidAt,
    this.customer,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id'] ?? '',
      paymentNumber: json['paymentNumber'] ?? '',
      amount: json['amount'] ?? 0,
      method: json['method'] ?? 'UPI',
      status: json['status'] ?? 'SUCCESS',
      gatewayTxnId: json['gatewayTxnId'],
      paidAt: json['paidAt'],
      customer: json['customer'],
    );
  }
}

class ActiveSessionModel {
  final String id;
  final String sessionId;
  final String username;
  final String? framedIpAddress;
  final String? macAddress;
  final dynamic uploadBytes;
  final dynamic downloadBytes;
  final int sessionDuration;
  final String? rateLimit;
  final String status;
  final String? startTime;
  final Map<String, dynamic>? nas;

  ActiveSessionModel({
    required this.id,
    required this.sessionId,
    required this.username,
    this.framedIpAddress,
    this.macAddress,
    this.uploadBytes = 0,
    this.downloadBytes = 0,
    this.sessionDuration = 0,
    this.rateLimit,
    this.status = 'ACTIVE',
    this.startTime,
    this.nas,
  });

  factory ActiveSessionModel.fromJson(Map<String, dynamic> json) {
    return ActiveSessionModel(
      id: json['id'] ?? '',
      sessionId: json['sessionId'] ?? '',
      username: json['username'] ?? '',
      framedIpAddress: json['framedIpAddress'],
      macAddress: json['macAddress'],
      uploadBytes: json['uploadBytes'] ?? 0,
      downloadBytes: json['downloadBytes'] ?? 0,
      sessionDuration: json['sessionDuration'] ?? 0,
      rateLimit: json['rateLimit'],
      status: json['status'] ?? 'ACTIVE',
      startTime: json['startTime'],
      nas: json['nas'],
    );
  }
}

class VoucherModel {
  final String id;
  final String code;
  final String? batchNumber;
  final String type;
  final int durationMinutes;
  final int downloadSpeed;
  final int uploadSpeed;
  final dynamic value;
  final int usedCount;
  final int maxUsers;
  final String status;

  VoucherModel({
    required this.id,
    required this.code,
    this.batchNumber,
    required this.type,
    required this.durationMinutes,
    required this.downloadSpeed,
    required this.uploadSpeed,
    required this.value,
    this.usedCount = 0,
    this.maxUsers = 1,
    required this.status,
  });

  factory VoucherModel.fromJson(Map<String, dynamic> json) {
    return VoucherModel(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      batchNumber: json['batchNumber'],
      type: json['type'] ?? 'TIME_BASED',
      durationMinutes: json['durationMinutes'] ?? 1440,
      downloadSpeed: json['downloadSpeed'] ?? 25,
      uploadSpeed: json['uploadSpeed'] ?? 25,
      value: json['value'] ?? 0,
      usedCount: json['usedCount'] ?? 0,
      maxUsers: json['maxUsers'] ?? 1,
      status: json['status'] ?? 'ACTIVE',
    );
  }
}

class RouterModel {
  final String id;
  final String name;
  final String ipAddress;
  final String vendor;
  final int cpuUsage;
  final int memoryUsage;
  final dynamic trafficInBps;
  final dynamic trafficOutBps;
  final String status;
  final List<dynamic>? interfacesJson;
  final List<dynamic>? routesJson;

  RouterModel({
    required this.id,
    required this.name,
    required this.ipAddress,
    required this.vendor,
    this.cpuUsage = 0,
    this.memoryUsage = 0,
    this.trafficInBps = 0,
    this.trafficOutBps = 0,
    required this.status,
    this.interfacesJson,
    this.routesJson,
  });

  factory RouterModel.fromJson(Map<String, dynamic> json) {
    return RouterModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      ipAddress: json['ipAddress'] ?? '',
      vendor: json['vendor'] ?? 'MikroTik',
      cpuUsage: json['cpuUsage'] ?? 0,
      memoryUsage: json['memoryUsage'] ?? 0,
      trafficInBps: json['trafficInBps'] ?? 0,
      trafficOutBps: json['trafficOutBps'] ?? 0,
      status: json['status'] ?? 'ONLINE',
      interfacesJson: json['interfacesJson'],
      routesJson: json['routesJson'],
    );
  }
}

class NasModel {
  final String id;
  final String name;
  final String identifier;
  final String ipAddress;
  final String vendor;
  final int port;
  final int authPort;
  final String? location;
  final String status;
  final int activeSessionsCount;

  NasModel({
    required this.id,
    required this.name,
    required this.identifier,
    required this.ipAddress,
    required this.vendor,
    this.port = 3799,
    this.authPort = 1812,
    this.location,
    required this.status,
    this.activeSessionsCount = 0,
  });

  factory NasModel.fromJson(Map<String, dynamic> json) {
    return NasModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      identifier: json['identifier'] ?? '',
      ipAddress: json['ipAddress'] ?? '',
      vendor: json['vendor'] ?? 'MikroTik',
      port: json['port'] ?? 3799,
      authPort: json['authPort'] ?? 1812,
      location: json['location'],
      status: json['status'] ?? 'ONLINE',
      activeSessionsCount: json['_count']?['activeSessions'] ?? 0,
    );
  }
}

class IpPoolModel {
  final String id;
  final String name;
  final String cidr;
  final String gateway;
  final String dnsPrimary;
  final String dnsSecondary;
  final int totalIps;
  final int usedIps;

  IpPoolModel({
    required this.id,
    required this.name,
    required this.cidr,
    required this.gateway,
    required this.dnsPrimary,
    required this.dnsSecondary,
    required this.totalIps,
    required this.usedIps,
  });

  factory IpPoolModel.fromJson(Map<String, dynamic> json) {
    return IpPoolModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      cidr: json['cidr'] ?? '',
      gateway: json['gateway'] ?? '',
      dnsPrimary: json['dnsPrimary'] ?? '8.8.8.8',
      dnsSecondary: json['dnsSecondary'] ?? '1.1.1.1',
      totalIps: json['totalIps'] ?? 0,
      usedIps: json['usedIps'] ?? 0,
    );
  }
}

class TicketModel {
  final String id;
  final String ticketNumber;
  final String subject;
  final String description;
  final String category;
  final String priority;
  final String status;
  final String? createdAt;
  final Map<String, dynamic>? customer;
  final List<dynamic>? comments;

  TicketModel({
    required this.id,
    required this.ticketNumber,
    required this.subject,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    this.createdAt,
    this.customer,
    this.comments,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'] ?? '',
      ticketNumber: json['ticketNumber'] ?? '',
      subject: json['subject'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'GENERAL',
      priority: json['priority'] ?? 'MEDIUM',
      status: json['status'] ?? 'OPEN',
      createdAt: json['createdAt'],
      customer: json['customer'],
      comments: json['comments'],
    );
  }
}
