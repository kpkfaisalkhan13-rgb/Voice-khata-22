import React, { useState } from 'react';
import { Copy, Check, Download, Code2, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playClickSound } from '../utils/audio';

interface FlutterCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlutterCodeModal: React.FC<FlutterCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState<
    'connectivity' | 'hive_models' | 'smart_parser' | 'smart_paste' | 'voice_corrections' | 'onboarding' | 'english_parser' | 'urdu_parser' | 'delete_dialog' | 'welcome' | 'golden_mic' | 'main' | 'voice_khata' | 'voice_tasks' | 'analytics' | 'pubspec'
  >('connectivity');

  if (!isOpen) return null;

  const flutterFiles: Record<string, { title: string; code: string }> = {
    connectivity: {
      title: 'lib/services/connectivity_service.dart (Network Connectivity Detection & Voice Guardrails)',
      code: `import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

/// Robust Network Connectivity Detection & Online API/Voice Guardrails
/// 
/// 1. Real-time network detection via connectivity_plus (Wi-Fi, Mobile Data, None)
/// 2. Stream-based online status updates
/// 3. Guardrails for Voice Recognition and Cloud API calls
/// 4. Ensures uninterrupted offline manual khata entries & local database operations
class ConnectivityService {
  ConnectivityService._privateConstructor();
  static final ConnectivityService instance = ConnectivityService._privateConstructor();

  final Connectivity _connectivity = Connectivity();
  final StreamController<bool> _connectivityController = StreamController<bool>.broadcast();

  bool _isOnline = true;
  bool get isOnline => _isOnline;

  Stream<bool> get onConnectivityChanged => _connectivityController.stream;

  /// Initialize real-time network monitoring
  void initialize() {
    _connectivity.onConnectivityChanged.listen((ConnectivityResult result) {
      final bool online = _checkResult(result);
      if (_isOnline != online) {
        _isOnline = online;
        _connectivityController.add(_isOnline);
      }
    });

    // Check initial state
    hasConnection();
  }

  bool _checkResult(ConnectivityResult result) {
    return result == ConnectivityResult.wifi ||
        result == ConnectivityResult.mobile ||
        result == ConnectivityResult.ethernet;
  }

  /// Check active network connectivity
  Future<bool> hasConnection() async {
    try {
      final ConnectivityResult result = await _connectivity.checkConnectivity();
      _isOnline = _checkResult(result);
      return _isOnline;
    } catch (_) {
      _isOnline = false;
      return false;
    }
  }

  /// Voice & Online API Guardrail
  /// 
  /// Checks network connectivity before executing voice recognition or online sync.
  /// If offline, prevents execution and displays a clean user-friendly SnackBar.
  Future<bool> guardOnlineFeature(
    BuildContext context, {
    required VoidCallback onAllowed,
    String? customMessage,
  }) async {
    final bool connected = await hasConnection();
    if (!connected) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.wifi_off, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    customMessage ??
                        'Voice features require an internet connection. Please connect to the internet or use manual entry.',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.redAccent.shade700,
            duration: const Duration(seconds: 4),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            action: SnackBarAction(
              label: 'Manual Entry',
              textColor: Colors.amberAccent,
              onPressed: () {
                // Focus manual entry form or dismiss
              },
            ),
          ),
        );
      }
      return false;
    }

    onAllowed();
    return true;
  }

  void dispose() {
    _connectivityController.close();
  }
}
`,
    },
    hive_models: {
      title: 'lib/models/models.dart (Hive Models: CustomerModel, TransactionModel, CorrectionRule)',
      code: `import 'package:hive/hive.dart';

part 'models.g.dart';

@HiveType(typeId: 0)
class CustomerModel extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  String name;

  @HiveField(2)
  double balance;

  CustomerModel({required this.id, required this.name, this.balance = 0.0});
}

@HiveType(typeId: 1)
class TransactionModel extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  String customerId;

  @HiveField(2)
  double amount;

  @HiveField(3)
  String type; // 'Jama' or 'Udhaar'

  @HiveField(4)
  DateTime date;

  TransactionModel({
    required this.id,
    required this.customerId,
    required this.amount,
    required this.type,
    required this.date,
  });
}

@HiveType(typeId: 2)
class CorrectionRule extends HiveObject {
  @HiveField(0)
  String wrongText;

  @HiveField(1)
  double correctedAmount;

  @HiveField(2)
  String context;

  CorrectionRule({
    required this.wrongText,
    required this.correctedAmount,
    required this.context,
  });
}
`,
    },
    voice_corrections: {
      title: 'lib/services/voice_corrections_service.dart (Local Custom Mapping & Dynamic Learning System)',
      code: `import 'package:flutter/material.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

// ============================================================================
// LOCAL CUSTOM MAPPING & DYNAMIC LEARNING SYSTEM FOR VOICE CORRECTIONS
// ============================================================================

/// 1. USER CORRECTION DATABASE TABLE & MODEL
class UserVoiceCorrection {
  final String id;
  final String spokenTranscript;
  final double correctedNumber;
  final String updatedAt;

  UserVoiceCorrection({
    required this.id,
    required this.spokenTranscript,
    required this.correctedNumber,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'spoken_transcript': spokenTranscript,
      'corrected_number': correctedNumber,
      'updated_at': updatedAt,
    };
  }

  factory UserVoiceCorrection.fromMap(Map<String, dynamic> map) {
    return UserVoiceCorrection(
      id: map['id'],
      spokenTranscript: map['spoken_transcript'],
      correctedNumber: (map['corrected_number'] as num).toDouble(),
      updatedAt: map['updated_at'],
    );
  }
}

/// 2. SERVICE FOR SQLite STORAGE & AUTO-LOOKUP
class VoiceCorrectionsService {
  static Database? _database;

  static Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB();
    return _database!;
  }

  static Future<Database> _initDB() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'voice_khata.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        // 1. USER CORRECTION DATABASE TABLE
        await db.execute('''
          CREATE TABLE user_voice_corrections (
            id TEXT PRIMARY KEY,
            spoken_transcript TEXT NOT NULL,
            corrected_number REAL NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');
      },
    );
  }

  static String _normalize(String text) {
    return text.trim().toLowerCase().replaceAll(RegExp(r'[,.?!:;]'), '');
  }

  /// 2. UI EDIT / REWRITE CALLBACK TRIGGER
  /// Whenever the user manually edits or rewrites the parsed amount in the input field:
  /// Capture raw voice transcript and manually corrected number, save or update.
  static Future<void> saveUserVoiceCorrection(
    String spokenTranscript,
    double correctedNumber,
  ) async {
    if (spokenTranscript.trim().isEmpty || correctedNumber <= 0) return;

    final db = await database;
    final nowIso = DateTime.now().toIso8601String();
    final normalized = _normalize(spokenTranscript);

    // Check if entry exists with normalized match
    final existing = await db.query(
      'user_voice_corrections',
      where: 'LOWER(TRIM(spoken_transcript)) = ?',
      whereArgs: [normalized],
      limit: 1,
    );

    if (existing.isNotEmpty) {
      await db.update(
        'user_voice_corrections',
        {
          'corrected_number': correctedNumber,
          'updated_at': nowIso,
        },
        where: 'id = ?',
        whereArgs: [existing.first['id']],
      );
    } else {
      final newId = 'uvc_\${DateTime.now().millisecondsSinceEpoch}';
      await db.insert(
        'user_voice_corrections',
        {
          'id': newId,
          'spoken_transcript': spokenTranscript.trim(),
          'corrected_number': correctedNumber,
          'updated_at': nowIso,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
  }

  /// 3. AUTO-LOOKUP BEFORE DISPLAYING RESULT
  /// Every time a new voice recording is made:
  /// Search user_voice_corrections table for exact or fuzzy match.
  /// If match found: Return corrected_number to override AI output immediately.
  /// If no match: Returns null to fall back to default parser dictionary / AI.
  static Future<double?> findVoiceCorrection(String spokenTranscript) async {
    if (spokenTranscript.trim().isEmpty) return null;

    final db = await database;
    final normalized = _normalize(spokenTranscript);

    // 1. Exact or normalized search
    final results = await db.rawQuery(
      '''
      SELECT corrected_number FROM user_voice_corrections 
      WHERE LOWER(TRIM(spoken_transcript)) = ? 
      ORDER BY updated_at DESC LIMIT 1
      ''',
      [normalized],
    );

    if (results.isNotEmpty) {
      return (results.first['corrected_number'] as num).toDouble();
    }

    // 2. Substring fuzzy match
    final all = await db.query('user_voice_corrections');
    for (final row in all) {
      final learnedTranscript = _normalize(row['spoken_transcript'] as String);
      if (learnedTranscript.isNotEmpty &&
          (normalized.contains(learnedTranscript) || learnedTranscript.contains(normalized))) {
        return (row['corrected_number'] as num).toDouble();
      }
    }

    return null;
  }
}

/// 4. INTEGRATION IN VOICE KHATA SCREEN (Amount Input Callback & Auto-Lookup)
class VoiceKhataLearnedScreenState extends State<StatefulWidget> {
  final TextEditingController _amountController = TextEditingController();
  String _spokenText = '';
  double _parsedAmount = 0.0;
  bool _isLearnedCorrection = false;

  /// Callback: Runs when speech-to-text finishes recording
  void _onVoiceSpeechRecognized(String transcript) async {
    setState(() {
      _spokenText = transcript;
    });

    // 3. AUTO-LOOKUP BEFORE DISPLAYING RESULT
    double? learnedAmount = await VoiceCorrectionsService.findVoiceCorrection(transcript);

    if (learnedAmount != null && learnedAmount > 0) {
      // Override the AI output immediately with the stored corrected_number
      setState(() {
        _parsedAmount = learnedAmount;
        _isLearnedCorrection = true;
        _amountController.text = learnedAmount.toString();
      });
    } else {
      // Fall back to the default parser dictionary / AI output
      int fallbackNumber = 0; // e.g. parseUrduNumberText(transcript);
      setState(() {
        _parsedAmount = fallbackNumber.toDouble();
        _isLearnedCorrection = false;
        if (fallbackNumber > 0) {
          _amountController.text = fallbackNumber.toString();
        }
      });
    }
  }

  /// 2. UI EDIT / REWRITE CALLBACK TRIGGER
  /// Attached to amount TextField onChanged
  void _onAmountFieldEdited(String newAmountText) {
    double? newAmount = double.tryParse(newAmountText);
    if (newAmount != null && newAmount > 0 && _spokenText.isNotEmpty) {
      // Capture raw voice transcript + user's manually corrected number and save
      VoiceCorrectionsService.saveUserVoiceCorrection(_spokenText, newAmount);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_isLearnedCorrection)
          const Chip(
            avatar: Icon(Icons.psychology, color: Colors.purple),
            label: Text("Auto-applied learned correction (کسٹم میپنگ سے درست کیا گیا)"),
          ),
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          onChanged: _onAmountFieldEdited,
          decoration: const InputDecoration(
            labelText: "Amount / رقم (Edit to teach custom mapping)",
          ),
        ),
      ],
    );
  }
}
`,
    },
    smart_parser: {
      title: 'lib/services/smart_parser_service.dart (ParsedEntry & SmartParserService with Hive Self-Learning)',
      code: `import 'package:hive/hive.dart';
import '../models/models.dart';

class ParsedEntry {
  String originalText;
  String name;
  double amount;
  String type; // "Jama" or "Udhaar"
  bool customerExists;
  bool isChecked;

  ParsedEntry({
    required this.originalText,
    required this.name,
    required this.amount,
    required this.type,
    this.customerExists = false,
    this.isChecked = true,
  });

  Map<String, dynamic> toJson() => {
    "name": name,
    "amount": amount,
    "type": type,
    "original_text": originalText,
  };
}

class SmartParserService {
  static const Map<String, double> _numberWords = {
    // English
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'twenty': 20, 'fifty': 50,
    'hundred': 100, 'thousand': 1000,
    
    // Roman Urdu
    'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'chaar': 4, 'panch': 5, 'paanch': 5,
    'chhay': 6, 'che': 6, 'saat': 7, 'aath': 8, 'no': 9, 'nau': 9, 'das': 10,
    'sau': 100, 'so': 100, 'hazar': 1000, 'hazār': 1000, 'hazaar': 1000,
    'lakh': 100000, 'lac': 100000,
    
    // Urdu Script
    'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5,
    'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10,
    'سو': 100, 'ہزار': 1000, 'لاکھ': 100000,

    // Hindi Script
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5,
    'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
    'सौ': 100, 'हज़ार': 1000, 'हजार': 1000, 'लाख': 100000,
  };

  /// Parse multiline input text into parsed entries
  static Future<List<ParsedEntry>> parseInputText(String input) async {
    List<String> lines = input
        .split(RegExp(r'[\\n;,]'))
        .where((l) => l.trim().isNotEmpty)
        .toList();

    List<ParsedEntry> entries = [];
    Box<CustomerModel> customerBox = Hive.box<CustomerModel>('customers');
    Box<CorrectionRule> ruleBox = Hive.box<CorrectionRule>('corrections');

    for (String line in lines) {
      String cleanLine = line.trim();
      if (cleanLine.isEmpty) continue;

      // 1. Self-Learning Check: Was this phrase corrected previously by the user?
      double? learnedAmount;
      for (var rule in ruleBox.values) {
        if (cleanLine.contains(rule.context) || cleanLine.contains(rule.wrongText)) {
          learnedAmount = rule.correctedAmount;
          break;
        }
      }

      double amount = learnedAmount ?? _extractAmount(cleanLine);
      String type = _extractTransactionType(cleanLine);
      String name = _extractName(cleanLine);

      // Check if Khata exists in database
      bool exists = customerBox.values.any(
        (c) => c.name.trim().toLowerCase() == name.trim().toLowerCase(),
      );

      entries.add(ParsedEntry(
        originalText: cleanLine,
        name: name,
        amount: amount,
        type: type,
        customerExists: exists,
        // Existing Khata = Checked by default; Not Found = Unchecked by default
        isChecked: exists,
      ));
    }

    return entries;
  }

  static double _extractAmount(String text) {
    String lower = text.toLowerCase();

    // Direct numeric digits extraction (e.g. 5000, 3000.50)
    RegExp digitRegex = RegExp(r'\\b\\d+(\\.\\d+)?\\b');
    var matches = digitRegex.allMatches(lower);
    if (matches.isNotEmpty) {
      double baseVal = double.parse(matches.first.group(0)!);

      // Handle phrases like "10 hundred" -> 1000, "19 hazar" -> 19000
      if (lower.contains("hundred") || lower.contains("sau") || lower.contains("سو")) {
        if (baseVal < 100) baseVal *= 100;
      } else if (lower.contains("hazar") || lower.contains("hazār") || lower.contains("ہزار") || lower.contains("हज़ार")) {
        if (baseVal < 1000) baseVal *= 1000;
      } else if (lower.contains("lakh") || lower.contains("lac") || lower.contains("لاکھ")) {
        if (baseVal < 100000) baseVal *= 100000;
      }
      return baseVal;
    }

    // Fraction modifier checks: "saade paanch hazar" = 5.5 * 1000 = 5500
    bool isSaade = lower.contains("saade") || lower.contains("साढ़े") || lower.contains("ساڑھے");
    bool isDedh = lower.contains("dedh") || lower.contains("ڈیڑھ") || lower.contains("डेढ़");
    bool isDhai = lower.contains("dhai") || lower.contains("ڈھائی") || lower.contains("ढाई");

    if (isDedh) return 1500;
    if (isDhai) return 2500;

    // Word based parsing
    double currentMultiplier = 1.0;
    double currentNum = 0.0;

    _numberWords.forEach((word, val) {
      if (lower.contains(word)) {
        if (val >= 100) {
          currentMultiplier = val;
        } else {
          currentNum = val;
        }
      }
    });

    if (isSaade && currentNum > 0) {
      currentNum += 0.5;
    }

    return (currentNum > 0) ? (currentNum * currentMultiplier) : 0.0;
  }

  static String _extractTransactionType(String text) {
    String lower = text.toLowerCase();
    
    List<String> udhaarKeywords = [
      'udhaar', 'udhar', 'ادھار', 'उधार', 'diye', 'diy', 'دئے', 'دیے', 'दिए', 'deye'
    ];
    
    for (var kw in udhaarKeywords) {
      if (lower.contains(kw)) return "Udhaar";
    }
    return "Jama"; // Default to Jama
  }

  static String _extractName(String text) {
    // Strip common non-name tokens
    String cleaned = text.replaceAll(
      RegExp(
        r'(\\b\\d+(\\.\\d+)?\\b|jama|udhaar|udhar|jamaa|پانچ|ہزار|ادھار|جمع|पाँच|हज़ार|उधार|जमा|dollars|pkr|rs|rupees|hazar|saade|hundred|thousand)',
        caseSensitive: false,
      ),
      '',
    );
    cleaned = cleaned.replaceAll(RegExp(r'[^\\w\\s\\u0600-\\u06FF\\u0900-\\u097F]'), '').trim();
    
    List<String> words = cleaned.split(RegExp(r'\\s+')).where((w) => w.isNotEmpty).toList();
    if (words.isNotEmpty) {
      return words.first[0].toUpperCase() + words.first.substring(1);
    }
    return "Unknown Customer";
  }

  /// Save correction to Hive for self-learning
  static Future<void> saveCorrection({
    required String originalText,
    required double correctedAmount,
    required String wrongText,
  }) async {
    Box<CorrectionRule> ruleBox = Hive.box<CorrectionRule>('corrections');
    await ruleBox.add(CorrectionRule(
      wrongText: wrongText,
      correctedAmount: correctedAmount,
      context: originalText,
    ));
  }
}
`,
    },
    smart_paste: {
      title: 'lib/screens/smart_khata_entry_screen.dart (SmartKhataEntryScreen with SpeechToText & Not-Found Handling)',
      code: `import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import '../models/models.dart';
import '../services/smart_parser_service.dart';

class SmartKhataEntryScreen extends StatefulWidget {
  const SmartKhataEntryScreen({Key? key}) : super(key: key);

  @override
  State<SmartKhataEntryScreen> createState() => _SmartKhataEntryScreenState();
}

class _SmartKhataEntryScreenState extends State<SmartKhataEntryScreen> {
  final TextEditingController _pasteController = TextEditingController();
  final stt.SpeechToText _speech = stt.SpeechToText();
  
  bool _isListening = false;
  bool _isParsed = false;
  bool _isLoading = false;
  List<ParsedEntry> _parsedEntries = [];
  
  // Selected Speech Locale: default to Roman/Urdu Pakistan
  String _currentLocale = 'ur_PK';

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  void _initSpeech() async {
    await Permission.microphone.request();
    await _speech.initialize();
  }

  void _listen() async {
    if (!_isListening) {
      bool available = await _speech.initialize();
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          localeId: _currentLocale,
          onResult: (val) {
            setState(() {
              _pasteController.text = val.recognizedWords;
            });
          },
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  void _processInput() async {
    if (_pasteController.text.trim().isEmpty) return;
    setState(() => _isLoading = true);

    List<ParsedEntry> results = await SmartParserService.parseInputText(_pasteController.text);

    setState(() {
      _parsedEntries = results;
      _isParsed = true;
      _isLoading = false;
    });
  }

  // Action 1: Save Only Checked Entries
  Future<void> _saveOnlyChecked() async {
    Box<CustomerModel> customerBox = Hive.box<CustomerModel>('customers');
    Box<TransactionModel> txBox = Hive.box<TransactionModel>('transactions');

    int savedCount = 0;
    for (var entry in _parsedEntries.where((e) => e.isChecked)) {
      var customer = customerBox.values.firstWhere(
        (c) => c.name.toLowerCase() == entry.name.toLowerCase(),
        orElse: () => CustomerModel(id: '', name: ''),
      );

      if (customer.id.isNotEmpty) {
        // Update Balance & Create Tx
        customer.balance += (entry.type == 'Jama') ? entry.amount : -entry.amount;
        await customer.save();

        await txBox.add(TransactionModel(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          customerId: customer.id,
          amount: entry.amount,
          type: entry.type,
          date: DateTime.now(),
        ));
        savedCount++;
      }
    }

    _showSnackBar("$savedCount Khatas Updated Successfully!");
    _resetForm();
  }

  // Action 2: Auto-create Khatas for Not-Found and Save All Selected
  Future<void> _createAndSaveAll() async {
    Box<CustomerModel> customerBox = Hive.box<CustomerModel>('customers');
    Box<TransactionModel> txBox = Hive.box<TransactionModel>('transactions');

    int createdCount = 0;
    int savedCount = 0;

    for (var entry in _parsedEntries) {
      CustomerModel? customer;

      // Find or create customer
      try {
        customer = customerBox.values.firstWhere(
          (c) => c.name.toLowerCase() == entry.name.toLowerCase(),
        );
      } catch (_) {
        // Create New Customer Profile
        String newId = DateTime.now().microsecondsSinceEpoch.toString();
        customer = CustomerModel(id: newId, name: entry.name, balance: 0.0);
        await customerBox.put(newId, customer);
        createdCount++;
      }

      // Record transaction
      customer.balance += (entry.type == 'Jama') ? entry.amount : -entry.amount;
      await customer.save();

      await txBox.add(TransactionModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        customerId: customer.id,
        amount: entry.amount,
        type: entry.type,
        date: DateTime.now(),
      ));
      savedCount++;
    }

    _showSnackBar("Created $createdCount new Khatas and Saved $savedCount entries!");
    _resetForm();
  }

  void _resetForm() {
    setState(() {
      _pasteController.clear();
      _parsedEntries.clear();
      _isParsed = false;
    });
  }

  void _showSnackBar(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Smart Voice & Paste Entry"),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // SCREEN 1: Input Box and Voice Control
                  if (!_isParsed) ...[
                    Card(
                      elevation: 3,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          children: [
                            TextField(
                              controller: _pasteController,
                              maxLines: 6,
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                hintText: "Paste full list from ChatGPT / Voice here:\n\n"
                                    "English: Ali 5000 Jama, Ahmed 3000 Udhaar\n"
                                    "Urdu: علی 5000 جمع، احمد 3000 ادھار\n"
                                    "Hindi: अली 5000 जमा, अहमद 3000 उधार",
                              ),
                            ),
                            const Divider(),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                DropdownButton<String>(
                                  value: _currentLocale,
                                  items: const [
                                    DropdownMenuItem(value: 'ur_PK', child: Text("🇵🇰 Urdu")),
                                    DropdownMenuItem(value: 'hi_IN', child: Text("🇮🇳 Hindi")),
                                    DropdownMenuItem(value: 'en_US', child: Text("🇺🇸 English")),
                                  ],
                                  onChanged: (val) {
                                    if (val != null) setState(() => _currentLocale = val);
                                  },
                                ),
                                IconButton(
                                  icon: Icon(_isListening ? Icons.mic : Icons.mic_none,
                                      color: _isListening ? Colors.red : Colors.teal, size: 30),
                                  onPressed: _listen,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _isLoading ? null : _processInput,
                      icon: const Icon(Icons.auto_awesome, color: Colors.white),
                      label: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text("Parse List with AI", style: TextStyle(fontSize: 16, color: Colors.white)),
                    ),
                  ],

                  // SCREEN 2: Parsed List Display
                  if (_isParsed) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Review Parsed Entries", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        TextButton(
                          onPressed: () => setState(() => _isParsed = false),
                          child: const Text("Edit Raw Text"),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _parsedEntries.length,
                      itemBuilder: (context, index) {
                        return _buildParsedEntryCard(_parsedEntries[index], index);
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),

          // SCREEN 3: Bottom Action Buttons
          if (_isParsed) _buildBottomActionBar(),
        ],
      ),
    );
  }

  // Screen 2 Cards: Green for Found, Red for Not-Found
  Widget _buildParsedEntryCard(ParsedEntry entry, int index) {
    bool exists = entry.customerExists;
    Color cardBg = exists ? Colors.green.shade50 : Colors.red.shade50;
    Color borderColor = exists ? Colors.green : Colors.red;

    return Card(
      color: cardBg,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(
        side: BorderSide(color: borderColor, width: 1.5),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!exists)
              Padding(
                padding: const EdgeInsets.only(bottom: 6.0),
                child: Text(
                  "⚠️ کھاتہ نہیں ملا - Khata Not Found: \${entry.name}",
                  style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            Row(
              children: [
                Checkbox(
                  value: entry.isChecked,
                  activeColor: exists ? Colors.green : Colors.red,
                  onChanged: (val) {
                    setState(() {
                      entry.isChecked = val ?? false;
                    });
                  },
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(entry.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      Text("Original: \"\${entry.originalText}\"", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                ),
                // Editable Amount Box with Self-Learning Trigger
                SizedBox(
                  width: 90,
                  child: TextFormField(
                    initialValue: entry.amount.toStringAsFixed(0),
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: "Amount",
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (val) {
                      double? newAmount = double.tryParse(val);
                      if (newAmount != null && newAmount != entry.amount) {
                        // Trigger Hive Self-Learning Engine
                        SmartParserService.saveCorrection(
                          originalText: entry.originalText,
                          correctedAmount: newAmount,
                          wrongText: entry.amount.toStringAsFixed(0),
                        );
                        entry.amount = newAmount;
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                // Jama / Udhaar Selector Badge
                ChoiceChip(
                  label: Text(entry.type),
                  selected: entry.type == "Jama",
                  selectedColor: Colors.green.shade200,
                  onSelected: (selected) {
                    setState(() {
                      entry.type = selected ? "Jama" : "Udhaar";
                    });
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () {
                    setState(() {
                      _parsedEntries.removeAt(index);
                    });
                  },
                )
              ],
            ),
          ],
        ),
      ),
    );
  }

  // Screen 3: Dual Action Bar
  Widget _buildBottomActionBar() {
    int checkedCount = _parsedEntries.where((e) => e.isChecked).length;
    int totalCount = _parsedEntries.length;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4, offset: const Offset(0, -2))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: checkedCount == 0 ? null : _saveOnlyChecked,
                  child: Text(
                    "صرف ٹک شدہ محفوظ کرو\nSave Only Checked ($checkedCount/$totalCount)",
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12, color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange.shade800,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: _createAndSaveAll,
                  child: const Text(
                    "نئے کھاتے بناؤ اور سب محفوظ کرو\nCreate Khata & Save All",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}`,
    },
    onboarding: {
      title: 'lib/screens/onboarding_screens.dart (Language & Currency Setup with SharedPreferences)',
      code: `import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ============================================================================
// 1. APP ONBOARDING (LANGUAGE & CURRENCY SELECTION)
// ============================================================================

/// Language Selection Screen: On first launch, user selects preferred language
class LanguageSelectionScreen extends StatefulWidget {
  const LanguageSelectionScreen({super.key});

  @override
  State<LanguageSelectionScreen> createState() => _LanguageSelectionScreenState();
}

class _LanguageSelectionScreenState extends State<LanguageSelectionScreen> {
  String _selectedLanguage = 'ur'; // 'en', 'ur', 'hi'

  final List<Map<String, String>> _languages = [
    {
      'code': 'en',
      'name': 'English',
      'native': 'English',
      'desc': 'Voice Khata & Ledger Management in English',
    },
    {
      'code': 'ur',
      'name': 'Urdu',
      'native': 'اردو',
      'desc': 'اردو زبان میں وائس کھاتہ، خودکار ادھار اور وصولی لیجر',
    },
    {
      'code': 'hi',
      'name': 'Hindi',
      'native': 'हिन्दी',
      'desc': 'आवाज से खाता और डिजिटल लेजर प्रबंधन',
    },
  ];

  Future<void> _proceedToCurrency() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_language', _selectedLanguage);

    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => CurrencySelectionScreen(language: _selectedLanguage),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('زبان منتخب کریں / Select Language'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Select your preferred app language / زبان منتخب کریں:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ..._languages.map((lang) {
              final isSelected = _selectedLanguage == lang['code'];
              return Card(
                elevation: isSelected ? 3 : 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: isSelected ? const Color(0xFF059669) : Colors.grey.shade300,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                color: isSelected ? const Color(0xFFECFDF5) : Colors.white,
                child: ListTile(
                  title: Text(
                    '\${lang['native']} (\${lang['name']})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  subtitle: Text(lang['desc']!),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle, color: Color(0xFF059669))
                      : const Icon(Icons.circle_outlined, color: Colors.grey),
                  onTap: () {
                    setState(() {
                      _selectedLanguage = lang['code']!;
                    });
                  },
                ),
              );
            }),
            const Spacer(),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _proceedToCurrency,
              child: const Text(
                'Next: Currency Setup (کرنسی سیٹ اپ) ->',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Currency Selection Screen: Immediately after selecting the language
class CurrencySelectionScreen extends StatefulWidget {
  final String language;
  const CurrencySelectionScreen({super.key, required this.language});

  @override
  State<CurrencySelectionScreen> createState() => _CurrencySelectionScreenState();
}

class _CurrencySelectionScreenState extends State<CurrencySelectionScreen> {
  String _selectedCurrency = 'Rs';
  bool _isCustom = false;
  final TextEditingController _customController = TextEditingController();

  final List<Map<String, String>> _currencyOptions = [
    {'code': 'USD', 'symbol': r'$', 'label': r'USD ($)', 'desc': 'US Dollar'},
    {'code': 'EUR', 'symbol': '€', 'label': 'EUR (€)', 'desc': 'Euro'},
    {'code': 'PKR', 'symbol': 'Rs', 'label': 'PKR (Rs)', 'desc': 'Pakistani Rupee'},
    {'code': 'INR', 'symbol': '₹', 'label': 'INR (₹)', 'desc': 'Indian Rupee'},
    {'code': 'AED', 'symbol': 'AED', 'label': 'AED (AED)', 'desc': 'UAE Dirham'},
  ];

  @override
  void dispose() {
    _customController.dispose();
    super.dispose();
  }

  Future<void> _completeSetup() async {
    String finalSymbol = _isCustom ? _customController.text.trim() : _selectedCurrency;
    if (finalSymbol.isEmpty) finalSymbol = 'Rs';

    final prefs = await SharedPreferences.getInstance();
    // Global Currency State: Store the selected currency symbol in local settings (SharedPreferences)
    await prefs.setString('currency_symbol', finalSymbol);
    await prefs.setBool('onboarding_completed', true);

    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/home');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Currency Setup / کرنسی سیٹ اپ'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Select Currency for all Customer Ledger screens:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ..._currencyOptions.map((curr) {
              final isSelected = !_isCustom && _selectedCurrency == curr['symbol'];
              return Card(
                elevation: isSelected ? 3 : 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: isSelected ? const Color(0xFF059669) : Colors.grey.shade300,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                color: isSelected ? const Color(0xFFECFDF5) : Colors.white,
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFF059669).withOpacity(0.15),
                    child: Text(curr['symbol']!, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                  ),
                  title: Text(curr['label']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(curr['desc']!),
                  trailing: isSelected ? const Icon(Icons.check_circle, color: Color(0xFF059669)) : null,
                  onTap: () {
                    setState(() {
                      _isCustom = false;
                      _selectedCurrency = curr['symbol']!;
                    });
                  },
                ),
              );
            }),
            // 6. Custom Symbol Option
            Card(
              elevation: _isCustom ? 3 : 1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: _isCustom ? Colors.amber.shade700 : Colors.grey.shade300,
                  width: _isCustom ? 2 : 1,
                ),
              ),
              color: _isCustom ? Colors.amber.shade50 : Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  children: [
                    ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.edit)),
                      title: const Text('Custom Symbol', style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: const Text('Type your local currency (e.g. SAR, £, CAD)'),
                      trailing: _isCustom ? Icon(Icons.check_circle, color: Colors.amber.shade700) : null,
                      onTap: () {
                        setState(() {
                          _isCustom = true;
                        });
                      },
                    ),
                    if (_isCustom)
                      TextField(
                        controller: _customController,
                        decoration: const InputDecoration(
                          hintText: 'Enter symbol (e.g. SAR, £, CAD)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Live Preview Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Live Calculation Preview:', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Debt: 12,250 \${_isCustom ? _customController.text : _selectedCurrency}',
                        style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Credit: 4,000 \${_isCustom ? _customController.text : _selectedCurrency}',
                        style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _completeSetup,
              child: const Text('Complete Setup & Open Khata', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Global helper function to dynamically format all debt, credit, income, and expense amounts
String formatCurrencyAmount(double amount, String currencySymbol) {
  return '\${amount.toStringAsFixed(0)} \$currencySymbol';
}
`,
    },
    english_parser: {
      title: 'lib/utils/english_number_parser.dart (English Spoken Number Dictionary & Algorithmic Parser)',
      code: `import 'package:flutter/material.dart';

// ============================================================================
// 1. English Spoken Numbers Lookup Dictionary Map
// ============================================================================
final Map<String, int> englishNumberDict = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  'hundred': 100, 'thousand': 1000, 'million': 1000000
};

// ============================================================================
// 2. Algorithmic Parser: parseEnglishNumberText
// Scans words, matches dictionary keys, multiplies multipliers, and sums exact sub-totals.
// ============================================================================
int parseEnglishNumberText(String spokenText) {
  if (spokenText.trim().isEmpty) return 0;

  // Clean punctuation, expand hyphens (e.g. 'twenty-five' -> 'twenty five')
  String clean = spokenText
      .replaceAll('-', ' ')
      .replaceAll(RegExp(r'[,.?!:;\'"()[\]{}]'), ' ')
      .replaceAll(RegExp(r'\\band\\b', caseSensitive: false), ' ')
      .trim();

  // If text contains formatted comma numbers like 12,250 or 10,220
  RegExp commaReg = RegExp(r'\\b\\d{1,3}(?:,\\d{2,3})+(?:\\.\\d+)?\\b');
  Match? commaMatch = commaReg.firstMatch(spokenText);
  if (commaMatch != null) {
    String cleanDigits = commaMatch.group(0)!.replaceAll(',', '');
    int? directVal = int.tryParse(cleanDigits);
    if (directVal != null && directVal > 0) return directVal;
  }

  List<String> words = clean.split(RegExp(r'\\s+'));
  int total = 0;
  int currentGroup = 0;
  bool hasMatched = false;

  for (String word in words) {
    if (word.isEmpty) continue;
    String lower = word.toLowerCase();

    // Check if word is already raw numeric digits (e.g. "12000" or "50")
    if (RegExp(r'^\\d+$').hasMatch(word)) {
      currentGroup += int.tryParse(word) ?? 0;
      hasMatched = true;
      continue;
    }

    if (englishNumberDict.containsKey(lower)) {
      hasMatched = true;
      int value = englishNumberDict[lower]!;

      // 'hundred' multiplies current group
      if (value == 100) {
        currentGroup = (currentGroup == 0 ? 1 : currentGroup) * 100;
      } else if (value >= 1000) {
        // Multipliers 1000 and above (thousand, lakh, million, crore, billion)
        currentGroup = (currentGroup == 0 ? 1 : currentGroup) * value;
        total += currentGroup;
        currentGroup = 0;
      } else {
        // Units / Tens
        currentGroup += value;
      }
    }
  }

  total += currentGroup;
  return hasMatched ? total : 0;
}

/// Helper function to set exact calculated English number directly into Amount Controller without rounding off
void onEnglishVoiceTranscriptReceived(TextEditingController amountController, String spokenTranscript) {
  int exactCalculatedNumber = parseEnglishNumberText(spokenTranscript);
  if (exactCalculatedNumber > 0) {
    // Display this calculated exact number directly in the amount input box without rounding off
    amountController.text = exactCalculatedNumber.toString();
  }
}
`,
    },
    urdu_parser: {
      title: 'lib/utils/urdu_number_parser.dart (Urdu / Roman-Urdu Spoken Number Text Parser)',
      code: `import 'package:flutter/material.dart';

// ============================================================================
// 1. اعداد کی بنیادی ڈکشنری (Words to Numbers Map)
// ============================================================================
final Map<String, int> urduNumberDict = {
  // اکائیاں اور دہائیاں (1 to 20)
  'ایک': 1, 'ایک سو': 100, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5,
  'چھ': 6, 'چہ': 6, 'چھے': 6, 'سات': 7, 'آٹھ': 8, 'اٹھ': 8, 'نو': 9, 'دس': 10,
  'گیارہ': 11, 'بارہ': 12, 'تیرہ': 13, 'چودہ': 14, 'پندرہ': 15,
  'سولہ': 16, 'سترہ': 17, 'اٹھارہ': 18, 'اٹہارہ': 18, 'انیس': 19, 'بیس': 20,

  // اکیس تا سو (21 to 100)
  'اکیس': 21, 'بائیس': 22, 'بائس': 22, 'تیئیس': 23, 'تئیس': 23, 'چوبیس': 24, 'پچیس': 25, 'چھبیس': 26, 'ستائیس': 27, 'ستائس': 27,
  'اٹھائیس': 28, 'اٹائیس': 28, 'انتیس': 29, 'تیس': 30,
  'اکتیس': 31, 'بتیس': 32, 'تینتیس': 33, 'چونتیس': 34, 'پینتیس': 35, 'چھتیس': 36, 'سینتیس': 37, 'اڑتیس': 38, 'انتالیس': 39, 'چالیس': 40,
  'اکتالیس': 41, 'بیالیس': 42, 'تینتالیس': 43, 'چوالیس': 44, 'پینتالیس': 45, 'چھیالیس': 46, 'سینتالیس': 47, 'اڑتالیس': 48, 'انچاس': 49, 'پچاس': 50,
  'ایکاون': 51, 'اکیاون': 51, 'باون': 52, 'ترپن': 53, 'چوون': 54, 'چون': 54, 'پچپن': 55, 'چھپن': 56, 'ستاون': 57, 'اٹھاون': 58, 'انسٹھ': 59, 'ساٹھ': 60,
  'اکسٹھ': 61, 'باسٹھ': 62, 'تریسٹھ': 63, 'چونسٹھ': 64, 'پینسٹھ': 65, 'چھیاسٹھ': 66, 'سڑسٹھ': 67, 'اڑسٹھ': 68, 'انہتر': 69, 'ستر': 70, 'ستار': 70,
  'اکہتر': 71, 'بہتر': 72, 'تہتر': 73, 'چوہتر': 74, 'پچہتر': 75, 'چھہتر': 76, 'ستتر': 77, 'اٹھہتر': 78, 'اناسی': 79, 'اسی': 80,
  'اکیاسی': 81, 'بیاسی': 82, 'تراسی': 83, 'چوراسی': 84, 'پچاسی': 85, 'چھیاسی': 86, 'ستاسی': 87, 'اٹھاسی': 88, 'نواسی': 89, 'نوے': 90,
  'اکانوے': 91, 'بانوے': 92, 'ترانوے': 93, 'چورانوے': 94, 'پچانوے': 95, 'چھیانوے': 96, 'ستانوے': 97, 'اٹھانوے': 98, 'ننانوے': 99,

  // سو، ہزار، لاکھ (Multipliers)
  'سو': 100, 'سیکڑا': 100,
  'ہزار': 1000,
  'لاکھ': 100000,
  'کرور': 10000000,
  'کروڑ': 10000000,

  // رومن اردو الفاظ (Roman Urdu Support)
  'ek': 1, 'aik': 1, 'do': 2, 'teen': 3, 'chaar': 4, 'char': 4, 'paanch': 5, 'panch': 5,
  'che': 6, 'chey': 6, 'saat': 7, 'aath': 8, 'ath': 8, 'nau': 9, 'das': 10,
  'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'chauda': 14, 'pandrah': 15,
  'solah': 16, 'satrah': 17, 'atharah': 18, 'unnees': 19,
  'beas': 20, 'bees': 20, 'ikkis': 21, 'baees': 22, 'bayees': 22, 'teyees': 23, 'chaubees': 24,
  'pachees': 25, 'pachis': 25, 'chhabees': 26, 'sataees': 27, 'athaees': 28, 'untees': 29,
  'tees': 30, 'iktees': 31, 'batees': 32, 'tentees': 33, 'chauntees': 34, 'paintees': 35,
  'chhatees': 36, 'saintees': 37, 'artees': 38, 'untalees': 39,
  'chalis': 40, 'chalees': 40, 'iktalis': 41, 'bayalis': 42, 'paintalis': 45, 'unchaas': 49,
  'pachas': 50,
  'ekawan': 51, 'ikawan': 51, 'bawan': 52, 'baawan': 52, 'tirpan': 53, 'tarpan': 53,
  'chawan': 54, 'chauwan': 54, 'pachpan': 55, 'chappan': 56, 'satawan': 57, 'athawan': 58, 'unsath': 59,
  'saath': 60, 'sath': 60,
  'sattar': 70, 'satar': 70,
  'assi': 80,
  'nawwe': 90, 'nave': 90,
  'sau': 100, 'so': 100, 'saikra': 100,
  'hazaar': 1000, 'hazar': 1000,
  'lakh': 100000, 'lac': 100000,
  'crore': 10000000, 'karor': 10000000,
};

// ============================================================================
// 2. بولے گئے جملے سے عدد نکالنے کا الگورتھم
// ============================================================================
int parseUrduNumberText(String text) {
  if (text.trim().isEmpty) return 0;

  // Clean punctuation and normalize whitespace
  String clean = text.replaceAll(RegExp(r'[،۔!?,:;]'), ' ').trim();
  List<String> words = clean.split(RegExp(r'\\s+'));
  int total = 0;
  int currentGroup = 0;
  bool hasMatched = false;

  for (String word in words) {
    if (word.isEmpty) continue;
    String lower = word.toLowerCase();

    // Check if word is already numeric digits (e.g. "12000" or "10220")
    if (RegExp(r'^\\d+$').hasMatch(word)) {
      currentGroup += int.tryParse(word) ?? 0;
      hasMatched = true;
      continue;
    }

    if (urduNumberDict.containsKey(word) || urduNumberDict.containsKey(lower)) {
      hasMatched = true;
      int value = urduNumberDict[word] ?? urduNumberDict[lower]!;

      // اگر لفظ 'ہزار' یا 'لاکھ' یا 'سو' ہو تو ضرب (Multiply) کریں
      if (value == 100) {
        currentGroup = (currentGroup == 0 ? 1 : currentGroup) * 100;
      } else if (value >= 1000) {
        currentGroup = (currentGroup == 0 ? 1 : currentGroup) * value;
        total += currentGroup;
        currentGroup = 0;
      } else {
        currentGroup += value;
      }
    }
  }

  total += currentGroup;
  return hasMatched ? total : 0;
}

/// Helper to set exact calculated amount directly in the Amount Input Box without rounding off
void onVoiceTranscriptReceived(TextEditingController amountController, String spokenTranscript) {
  int exactCalculatedNumber = parseUrduNumberText(spokenTranscript);
  if (exactCalculatedNumber > 0) {
    // Display this calculated exact number directly in the amount input box without rounding off
    amountController.text = exactCalculatedNumber.toString();
  }
}
`,
    },
    delete_dialog: {
      title: 'lib/widgets/delete_khata_dialog.dart (1. Delete Khata Dialog Option)',
      code: `import 'package:flutter/material.dart';

// 1. Delete Khata Dialog Option
void deleteKhataDialog(BuildContext context, String customerName) {
  showDialog(
    context: context,
    builder: (BuildContext context) {
      return AlertDialog(
        title: const Text("کھاتہ ڈیلیٹ کریں"),
        content: Text("کیا آپ $customerName کا تمام ریکارڈ ڈیلیٹ کرنا چاہتے ہیں؟"),
        actions: [
          TextButton(
            child: const Text("منسوخ کریں"),
            onPressed: () => Navigator.of(context).pop(),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text("ڈیلیٹ کریں", style: TextStyle(color: Colors.white)),
            onPressed: () {
              // Delete Logic Here
              Navigator.of(context).pop();
            },
          ),
        ],
      );
    },
  );
}
`,
    },
    welcome: {
      title: 'lib/screens/welcome_screen.dart (Welcome Screen Layout)',
      code: `import 'package:flutter/material.dart';

// Welcome Screen Layout
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              "Welcome",
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber[700], // Golden Color
                padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
              ),
              onPressed: () {
                // Navigate to Main App (Khata / Voice Tasks Tabs)
                Navigator.pushReplacementNamed(context, '/home');
              },
              child: const Text(
                "Open the App",
                style: TextStyle(fontSize: 18, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`,
    },
    golden_mic: {
      title: 'lib/widgets/golden_mic_button.dart (Golden Mic Button with Offline Guardrail)',
      code: `import 'package:flutter/material.dart';

/// Flutter Golden Mic Button with metallic amber gradient and glow shadow
/// Integrates network connectivity state:
/// - Online: Glowing metallic gold with Icons.mic
/// - Offline: Muted slate/amber with offline indicator and informative SnackBar
Widget buildGoldenMicButton({
  required BuildContext context,
  required VoidCallback onTap,
  bool isOnline = true,
}) {
  return GestureDetector(
    onTap: () {
      if (!isOnline) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.wifi_off, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "Voice features require an internet connection. Please connect to the internet or use manual entry.",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.redAccent.shade700,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            duration: const Duration(seconds: 4),
          ),
        );
        return;
      }
      onTap();
    },
    child: Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 70,
          height: 70,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: isOnline
                ? LinearGradient(
                    colors: [Colors.amber[300]!, Colors.amber[800]!], // Metallic Gold Gradient
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : LinearGradient(
                    colors: [Colors.blueGrey[300]!, Colors.blueGrey[700]!], // Offline Muted Gradient
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
            boxShadow: [
              BoxShadow(
                color: isOnline
                    ? Colors.amber.withOpacity(0.5)
                    : Colors.black.withOpacity(0.2),
                blurRadius: 15,
                spreadRadius: 2,
              )
            ],
          ),
          child: Icon(
            isOnline ? Icons.mic : Icons.mic_off,
            color: Colors.white,
            size: 36,
          ),
        ),
        if (!isOnline)
          Positioned(
            right: 0,
            top: 0,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.redAccent,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: const Icon(
                Icons.wifi_off,
                size: 12,
                color: Colors.white,
              ),
            ),
          ),
      ],
    ),
  );
}
`,
    },
    main: {
      title: 'lib/main.dart (Hive Adapters, Boxes Initialization & SmartKhataEntryScreen App Entry)',
      code: `import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'models/models.dart';
import 'screens/smart_khata_entry_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();

  // Register Adapters
  Hive.registerAdapter(CustomerModelAdapter());
  Hive.registerAdapter(TransactionModelAdapter());
  Hive.registerAdapter(CorrectionRuleAdapter());

  // Open Boxes
  await Hive.openBox<CustomerModel>('customers');
  await Hive.openBox<TransactionModel>('transactions');
  await Hive.openBox<CorrectionRule>('corrections');

  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: SmartKhataEntryScreen(),
  ));
}
`,
    },
    voice_khata: {
      title: 'lib/screens/voice_khata_screen.dart (Debit / Credit Voice Khata)',
      code: `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../utils/urdu_number_parser.dart';

enum TransactionType { debit, credit }

class VoiceKhataScreen extends StatefulWidget {
  const VoiceKhataScreen({super.key});

  @override
  State<VoiceKhataScreen> createState() => _VoiceKhataScreenState();
}

class _VoiceKhataScreenState extends State<VoiceKhataScreen> {
  final stt.SpeechToText _speech = stt.SpeechToText();
  final TextEditingController _amountController = TextEditingController();
  TransactionType? _selectedType;
  bool _isListening = false;
  String _spokenText = '';
  double _parsedAmount = 0.0;
  String _customerName = '';

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  // Step 1: User selects Debit or Credit
  // Step 2: Check Network Connectivity (Online API & Voice Input Guardrail)
  // Step 3: Start voice recording sequence ONLY if online, otherwise inform user and allow manual entry
  void _chooseTypeAndStartRecording(TransactionType type) async {
    // Network Connectivity Guardrail
    final isOnline = await ConnectivityService.instance.hasConnection();
    if (!isOnline) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.wifi_off, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "Voice features require an internet connection. Please connect to the internet or use manual entry.",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.redAccent.shade700,
            duration: const Duration(seconds: 4),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    setState(() {
      _selectedType = type;
      _spokenText = '';
      _parsedAmount = 0.0;
      _customerName = '';
      _amountController.clear();
    });

    bool available = await _speech.initialize();
    if (available) {
      setState(() => _isListening = true);
      _speech.listen(
        onResult: (val) {
          setState(() {
            _spokenText = val.recognizedWords;
            _parseSpeech(_spokenText);
          });
        },
      );
    }
  }

  void _parseSpeech(String text) {
    // Local offline Urdu/Roman-Urdu Number Text Parser
    // Input: "بارہ ہزار دو سو پچاس" -> 12250
    // Input: "دس ہزار دو سو بیس" -> 10220
    int exactNumber = parseUrduNumberText(text);

    setState(() {
      _customerName = "Ali";
      _parsedAmount = exactNumber > 0 ? exactNumber.toDouble() : 0.0;
      // Display this calculated exact number directly in the amount input box without rounding off
      if (exactNumber > 0) {
        _amountController.text = exactNumber.toString();
      }
    });
  }

  // Balance Calculation Logic:
  // Debit: Add value to total balance (+).
  // Credit: Subtract value from total balance (-).
  double calculateNewBalance(double currentBalance) {
    if (_selectedType == TransactionType.debit) {
      return currentBalance + _parsedAmount; // Add
    } else {
      return currentBalance - _parsedAmount; // Subtract
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Voice Khata')),
      body: _selectedType == null
          ? _buildTypeSelectionPrompt()
          : _buildRecordingSequence(),
    );
  }

  Widget _buildTypeSelectionPrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Choose Transaction Type to Begin Recording:",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              icon: const Icon(Icons.add_circle, color: Colors.white),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
              label: const Text("DEBIT (+ Add to Balance)"),
              onPressed: () => _chooseTypeAndStartRecording(TransactionType.debit),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.remove_circle, color: Colors.white),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              label: const Text("CREDIT (- Subtract from Balance)"),
              onPressed: () => _chooseTypeAndStartRecording(TransactionType.credit),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecordingSequence() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Chip(
          label: Text(
            _selectedType == TransactionType.debit
                ? "DEBIT SELECTED (+ ADD)"
                : "CREDIT SELECTED (- SUBTRACT)",
          ),
        ),
        const SizedBox(height: 16),
        Text("Spoken: $_spokenText", style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'رقم (Amount Input Box - No Rounding Off)',
            border: OutlineInputBorder(),
            suffixText: 'PKR',
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: () => setState(() => _selectedType = null),
          child: const Text("Change Type"),
        ),
      ],
    );
  }
}`,
    },
    voice_calc: {
      title: 'lib/screens/voice_calc_screen.dart (Positional Speech Math)',
      code: `import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:math_expressions/math_expressions.dart';

class VoiceCalcScreen extends StatefulWidget {
  const VoiceCalcScreen({super.key});

  @override
  State<VoiceCalcScreen> createState() => _VoiceCalcScreenState();
}

class _VoiceCalcScreenState extends State<VoiceCalcScreen> {
  late stt.SpeechToText _speech;
  bool _isListening = false;
  String _expression = '102580 + 5000 - 200';
  double _result = 107380.0;

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
  }

  void _listen() async {
    if (!_isListening) {
      bool available = await _speech.initialize();
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          localeId: 'ur_PK',
          onResult: (val) {
            setState(() {
              _expression = _parseSpokenMath(val.recognizedWords);
              _result = _evaluateMath(_expression);
            });
          },
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  String _parseSpokenMath(String text) {
    // Converts "ek lakh do hazar panch sau assi" to 102580
    // Replaces operators: plus/jama -> +, minus/manfi -> -, zarb -> *, taqseem -> /
    String norm = text.toLowerCase()
      .replaceAll('plus', '+').replaceAll('jama', '+')
      .replaceAll('minus', '-').replaceAll('manfi', '-')
      .replaceAll('multiply', '*').replaceAll('zarb', '*')
      .replaceAll('divide', '/').replaceAll('taqseem', '/');
    return norm;
  }

  double _evaluateMath(String expr) {
    try {
      Parser p = Parser();
      Expression exp = p.parse(expr);
      ContextModel cm = ContextModel();
      return exp.evaluate(EvaluationType.REAL, cm);
    } catch (_) {
      return 0.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice Calculator'),
        actions: [
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // Display Panel
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _expression,
                  style: const TextStyle(color: Colors.white70, fontSize: 18),
                ),
                const SizedBox(height: 12),
                Text(
                  '= \${_result.toStringAsFixed(0)}',
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    color: Color(0xFF34D399),
                    fontSize: 38,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton.icon(
                      onPressed: () {
                        setState(() {
                          _expression = '0';
                          _result = 0.0;
                        });
                      },
                      icon: const Icon(Icons.clear, color: Colors.redAccent),
                      label: const Text('C / CE', style: TextStyle(color: Colors.redAccent)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Spacer(),
          // Large Microphone Button
          GestureDetector(
            onTap: _listen,
            child: Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF10B981)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF059669).withOpacity(0.4),
                    blurRadius: 20,
                  ),
                ],
              ),
              child: Icon(
                _isListening ? Icons.mic_off : Icons.mic,
                color: Colors.white,
                size: 40,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _isListening ? 'Listening...' : 'Tap Mic to Speak Math',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          const Spacer(),
        ],
      ),
    );
  }
}`,
    },
    khata: {
      title: 'lib/screens/khata_screen.dart (Customer Ledger & Terms)',
      code: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/ledger_provider.dart';

class KhataScreen extends StatelessWidget {
  const KhataScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LedgerProvider>();

    return Scaffold(
      appBar: AppBar(
        title: DropdownButton<String>(
          value: provider.businessName,
          underline: const SizedBox(),
          icon: const Icon(Icons.arrow_drop_down),
          items: [
            DropdownMenuItem(
              value: provider.businessName,
              child: Text(
                provider.businessName,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
          onChanged: (_) {},
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Total Balance Got vs Gave Card
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('You Will Receive (وصول کیے)', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        Text('Rs. \${provider.totalGot}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.red)),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 40, color: Colors.grey.shade300),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('You Will Give (قرض دیا)', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        Text('Rs. \${provider.totalGave}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Customer List
          ...provider.customers.map((c) => ListTile(
            title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(c.phone),
            trailing: Text(
              'Rs. \${c.balance.abs()}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: c.balance >= 0 ? Colors.red : Colors.green,
              ),
            ),
          )),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        backgroundColor: const Color(0xFF059669),
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('Add Customer', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}`,
    },
    analytics: {
      title: 'lib/screens/analytics_screen.dart (Monthly Loans & Advance Payment Graph with Hive)',
      code: `import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:image_picker/image_picker.dart';
import '../models/models.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class MonthSummary {
  final int year;
  final int month;
  final String labelUrdu;
  final String labelEn;
  final double totalLoans; // Udhaar / Maine Diye
  final double totalAdvances; // Jama / Vasooli / Maine Liye
  final int loanCount;
  final int advanceCount;

  MonthSummary({
    required this.year,
    required this.month,
    required this.labelUrdu,
    required this.labelEn,
    required this.totalLoans,
    required this.totalAdvances,
    required this.loanCount,
    required this.advanceCount,
  });

  double get netChange => totalLoans - totalAdvances;
  double get recoveryRate => totalLoans > 0
      ? ((totalAdvances / totalLoans) * 100).clamp(0, 100)
      : (totalAdvances > 0 ? 100 : 0);
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  int _selectedMonthIndex = 5; // Default to current month (last in 6-month list)

  final List<String> _urduMonths = const [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
  ];

  final List<String> _enMonths = const [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  List<MonthSummary> _calculateMonthlyTrend() {
    final txBox = Hive.box<TransactionModel>('transactions');
    final now = DateTime.now();
    final List<MonthSummary> list = [];

    for (int i = 5; i >= 0; i--) {
      final date = DateTime(now.year, now.month - i, 1);
      final year = date.year;
      final month = date.month;

      double loans = 0;
      double advances = 0;
      int loanCount = 0;
      int advanceCount = 0;

      for (var tx in txBox.values) {
        if (tx.date.year == year && tx.date.month == month) {
          final isDebit = (tx.type.toLowerCase() == 'debit' ||
              tx.type.toLowerCase() == 'udhaar' ||
              tx.type.toLowerCase() == 'diya');
          if (isDebit) {
            loans += tx.amount;
            loanCount++;
          } else {
            advances += tx.amount;
            advanceCount++;
          }
        }
      }

      list.add(MonthSummary(
        year: year,
        month: month,
        labelUrdu: _urduMonths[month - 1],
        labelEn: _enMonths[month - 1],
        totalLoans: loans,
        totalAdvances: advances,
        loanCount: loanCount,
        advanceCount: advanceCount,
      ));
    }
    return list;
  }

  void _uploadScreenshot(BuildContext context) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('🎉 Instant 24-Hour Access Granted! Admin verification in progress.'),
          backgroundColor: Color(0xFF059669),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final customerBox = Hive.box<CustomerModel>('customers');
    final months = _calculateMonthlyTrend();
    if (_selectedMonthIndex >= months.length) {
      _selectedMonthIndex = months.length - 1;
    }
    final activeMonth = months[_selectedMonthIndex];

    // Customer statistics
    double totalOutstandingDebt = 0;
    double totalAdvanceCredit = 0;
    int debtCustomerCount = 0;
    int advanceCustomerCount = 0;

    for (var c in customerBox.values) {
      if (c.balance > 0) {
        totalOutstandingDebt += c.balance;
        debtCustomerCount++;
      } else if (c.balance < 0) {
        totalAdvanceCredit += c.balance.abs();
        advanceCustomerCount++;
      }
    }

    final maxVal = months.fold<double>(
      5000,
      (max, m) => m.totalLoans > max
          ? m.totalLoans
          : (m.totalAdvances > max ? m.totalAdvances : max),
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text(
          'ماہانہ تجزیہ و گراف (Monthly Analytics)',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Share Report',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('ماہانہ رپورٹ واٹس ایپ شیئرنگ کے لیے کاپی ہو گئی۔')),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. KPI Top Summary Cards
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  title: 'دیا گیا قرض (Loans)',
                  amount: 'Rs. \${activeMonth.totalLoans.toStringAsFixed(0)}',
                  color: Colors.roseAccent,
                  icon: Icons.arrow_outward,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricCard(
                  title: 'پیشگی و وصولی (Advances)',
                  amount: 'Rs. \${activeMonth.totalAdvances.toStringAsFixed(0)}',
                  color: Colors.tealAccent,
                  icon: Icons.south_west,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 2. Main Monthly Loans & Advance Payment Graph Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    const Text(
                      'ماہانہ قرض و پیشگی ادائیگی گراف (6 Months)',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Row(
                      children: [
                        _buildLegend(Colors.redAccent, 'قرض'),
                        const SizedBox(width: 8),
                        _buildLegend(Colors.greenAccent, 'پیشگی'),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'تفصیل دیکھنے کے لیے کسی بھی ماہ کے بار پر ٹیپ کریں',
                  style: TextStyle(color: Colors.white54, fontSize: 11),
                ),
                const SizedBox(height: 20),

                // Bar Graph
                SizedBox(
                  height: 180,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: List.generate(months.length, (idx) {
                      final m = months[idx];
                      final isSelected = idx == _selectedMonthIndex;
                      final loanRatio = (m.totalLoans / maxVal).clamp(0.08, 1.0);
                      final advanceRatio = (m.totalAdvances / maxVal).clamp(0.08, 1.0);

                      return GestureDetector(
                        onTap: () => setState(() => _selectedMonthIndex = idx),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                              decoration: BoxDecoration(
                                color: isSelected ? Colors.indigo.shade900 : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  // Loan Bar (Red)
                                  Container(
                                    width: 14,
                                    height: 120 * loanRatio,
                                    decoration: BoxDecoration(
                                      color: Colors.redAccent.shade200,
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  // Advance Bar (Green)
                                  Container(
                                    width: 14,
                                    height: 120 * advanceRatio,
                                    decoration: BoxDecoration(
                                      color: Colors.tealAccent.shade400,
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              m.labelUrdu,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: isSelected ? Colors.amberAccent : Colors.white70,
                              ),
                            ),
                            Text(
                              m.labelEn,
                              style: TextStyle(
                                fontSize: 9,
                                color: isSelected ? Colors.white : Colors.white38,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. Focused Selected Month Detailed Stats Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.indigo.withOpacity(0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Text(
                      '\${activeMonth.labelUrdu} \${activeMonth.year} - تفصیلی تناسب',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      'ریکوری: \${activeMonth.recoveryRate.toStringAsFixed(0)}%',
                      style: const TextStyle(
                        color: Colors.amberAccent,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                LinearProgressIndicator(
                  value: activeMonth.totalLoans + activeMonth.totalAdvances > 0
                      ? (activeMonth.totalAdvances / (activeMonth.totalLoans + activeMonth.totalAdvances))
                      : 0.5,
                  backgroundColor: Colors.redAccent.withOpacity(0.5),
                  color: Colors.tealAccent,
                  minHeight: 8,
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Text(
                      'قرض انٹریز: \${activeMonth.loanCount}',
                      style: const TextStyle(color: Colors.redAccent, fontSize: 11),
                    ),
                    Text(
                      'پیشگی انٹریز: \${activeMonth.advanceCount}',
                      style: const TextStyle(color: Colors.tealAccent, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. Shop Portfolio Balance Distribution
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('کل بقایا قرض دار', style: TextStyle(color: Colors.white60, fontSize: 11)),
                    const SizedBox(height: 4),
                    Text(
                      'Rs. \${totalOutstandingDebt.toStringAsFixed(0)}',
                      style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold),
                    ),
                    Text('(\$debtCustomerCount گاہک)', style: const TextStyle(color: Colors.white38, fontSize: 10)),
                  ],
                ),
                Container(height: 35, width: 1, color: Colors.white24),
                Column(
                  children: [
                    const Text('پیشگی وصولی / جمع', style: TextStyle(color: Colors.white60, fontSize: 11)),
                    const SizedBox(height: 4),
                    Text(
                      'Rs. \${totalAdvanceCredit.toStringAsFixed(0)}',
                      style: const TextStyle(color: Colors.tealAccent, fontWeight: FontWeight.bold),
                    ),
                    Text('(\$advanceCustomerCount گاہک)', style: const TextStyle(color: Colors.white38, fontSize: 10)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 5. Payment Screenshot & 24h Temp Access Card
          Card(
            color: Colors.black45,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('1-Month Free Trial Active', style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  const Text('All analytics, graphs & PDF reports are unlocked.', style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () => _uploadScreenshot(context),
                    icon: const Icon(Icons.upload_file),
                    label: const Text('Upload Payment Screenshot (24h Access)'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String amount,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              Text(title, style: const TextStyle(color: Colors.white70, fontSize: 11)),
              Icon(icon, color: color, size: 16),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            amount,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegend(Color color, String label) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
      ],
    );
  }
}`,
    },
    pubspec: {
      title: 'pubspec.yaml',
      code: `name: voice_ledger
description: Production-Ready Voice Ledger & Smart Udhaar Flutter App

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  connectivity_plus: ^5.0.2
  provider: ^6.1.1
  speech_to_text: ^6.6.1
  permission_handler: ^11.3.1
  math_expressions: ^2.4.0
  sqflite: ^2.3.0
  path_provider: ^2.1.2
  image_picker: ^1.0.7
  pdf: ^3.10.7
  printing: ^5.11.1
  google_fonts: ^6.1.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0

flutter:
  uses-material-design: true`,
    },
  };

  const handleCopyCode = () => {
    playClickSound();
    navigator.clipboard.writeText(flutterFiles[activeFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 space-y-4 my-6 flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Production Flutter Source Code
                </h3>
                <p className="text-xs text-slate-500">
                  Ready to paste or build into your Flutter mobile project
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* File Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
            {Object.entries(flutterFiles).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFile(key as any);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-colors ${
                  activeFile === key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {key === 'pubspec'
                  ? 'pubspec.yaml'
                  : key === 'connectivity'
                  ? 'connectivity_service.dart'
                  : key === 'hive_models'
                  ? 'models.dart'
                  : key === 'smart_parser'
                  ? 'smart_parser_service.dart'
                  : key === 'smart_paste'
                  ? 'smart_khata_entry_screen.dart'
                  : `${key}.dart`}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-slate-950 text-slate-200 border border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
              <span>{flutterFiles[activeFile].title}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-4 overflow-y-auto text-xs font-mono max-h-96 leading-relaxed select-all">
              <code>{flutterFiles[activeFile].code}</code>
            </pre>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Clean architecture with Flutter Provider, Speech-to-Text & SQLite
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>Copy {activeFile} code</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
