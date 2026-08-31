class AppConfig {
  static const String environment = String.fromEnvironment('ENV', defaultValue: 'production');
  
  // Base URLs
  static String get gatewayBaseUrl {
    switch (environment) {
      case 'development':
        return 'http://10.0.2.2:3001'; // Android emulator localhost alias
      case 'production':
      default:
        return 'https://api.setu.in';
    }
  }

  static String get syncPushUrl => '\$gatewayBaseUrl/sync/push';
  static String get syncPullUrl => '\$gatewayBaseUrl/sync/pull';
  static String get authUrl => '\$gatewayBaseUrl/auth';
  static String get healthUrl => '\$gatewayBaseUrl/health';
  static String get teleconsultWsUrl => '\$gatewayBaseUrl/teleconsult';
  static String get referralUrl => '\$gatewayBaseUrl/referral';
}
