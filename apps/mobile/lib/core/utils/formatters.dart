import 'dart:math';
import 'package:intl/intl.dart';

class Formatters {
  static String currency(dynamic amount, {String symbol = '₹'}) {
    final num val = (amount is num)
        ? amount
        : double.tryParse(amount?.toString() ?? '0') ?? 0;
    final formatter = NumberFormat.currency(
      locale: 'en_IN',
      symbol: symbol,
      decimalDigits: 2,
    );
    return formatter.format(val);
  }

  static String bytes(dynamic bytes, [int decimals = 2]) {
    final num val = (bytes is num)
        ? bytes
        : double.tryParse(bytes?.toString() ?? '0') ?? 0;
    if (val <= 0) return '0 B';

    const suffixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    final i = (log(val) / log(1024)).floor();
    final num size = val / pow(1024, i);

    return '${size.toStringAsFixed(decimals)} ${suffixes[i]}';
  }

  static String duration(dynamic seconds) {
    final int s = (seconds is num)
        ? seconds.toInt()
        : int.tryParse(seconds?.toString() ?? '0') ?? 0;

    final hrs = s ~/ 3600;
    final mins = (s % 3600) ~/ 60;
    final secs = s % 60;

    if (hrs > 0) return '${hrs}h ${mins}m';
    if (mins > 0) return '${mins}m ${secs}s';
    return '${secs}s';
  }

  static String date(dynamic date) {
    if (date == null) return 'N/A';
    DateTime? d;
    if (date is DateTime) {
      d = date;
    } else {
      d = DateTime.tryParse(date.toString());
    }
    if (d == null) return 'N/A';
    return DateFormat('MMM dd, yyyy').format(d);
  }

  static String dateTime(dynamic date) {
    if (date == null) return 'N/A';
    DateTime? d;
    if (date is DateTime) {
      d = date;
    } else {
      d = DateTime.tryParse(date.toString());
    }
    if (d == null) return 'N/A';
    return DateFormat('MMM dd, yyyy · hh:mm a').format(d);
  }
}
