import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../db/database.dart';

class CareGap {
  final String type;
  final String priority;
  final String patientId;
  final String resourceId;
  final String description;
  final double ageInDays;

  CareGap({
    required this.type,
    required this.priority,
    required this.patientId,
    required this.resourceId,
    required this.description,
    required this.ageInDays,
  });
}

class CareGapLocalService {
  final AppDatabase _db;

  CareGapLocalService(this._db);

  Future<List<CareGap>> getLocalDashboard(String facilityId) async {
    List<CareGap> gaps = [];
    final now = DateTime.now();

    // 1. Unresolved High Risks (RiskAssessment with HIGH/EMERGENCY not mitigated)
    try {
      final risks = await (_db.select(_db.localResources)
            ..where((t) => t.resourceType.equals('RiskAssessment'))
            ..where((t) => t.isDeleted.equals(false)))
          .get();

      for (var record in risks) {
        final risk = jsonDecode(record.jsonPayload);
        final prediction = risk['prediction'] as List?;
        if (prediction != null && prediction.isNotEmpty) {
          final level = prediction[0]['qualitativeRisk']?['text'];
          if (level == 'EMERGENCY' || level == 'HIGH_RISK') {
            final lastUpdatedStr = risk['meta']?['lastUpdated'];
            final updatedDate = lastUpdatedStr != null ? DateTime.parse(lastUpdatedStr) : record.updatedAt;
            final ageDays = now.difference(updatedDate).inHours / 24.0;
            
            // If older than 1 day, it's a gap.
            if (ageDays > 1) {
              final ref = risk['subject']?['reference'] as String? ?? 'Unknown';
              gaps.add(CareGap(
                type: 'UNRESOLVED_RISK',
                priority: level == 'EMERGENCY' ? 'EMERGENCY' : 'HIGH',
                patientId: ref.replaceAll('Patient/', ''),
                resourceId: risk['id'] ?? record.id,
                description: 'Unresolved \$level risk: \${prediction[0]['rationale'] ?? ''}',
                ageInDays: ageDays,
              ));
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Failed to evaluate unresolved risks: \$e');
    }

    // 2. Stalled Referrals
    try {
      final tasks = await (_db.select(_db.localResources)
            ..where((t) => t.resourceType.equals('Task'))
            ..where((t) => t.isDeleted.equals(false)))
          .get();

      for (var record in tasks) {
        final task = jsonDecode(record.jsonPayload);
        if (task['code'] == 'teleconsult' && (task['status'] == 'requested' || task['status'] == 'accepted')) {
          final isOwner = task['owner']?['reference'] == 'Organization/\$facilityId';
          final isRequester = task['requester']?['reference'] == 'Organization/\$facilityId';
          
          if (isOwner || isRequester) {
            final authoredStr = task['authoredOn'];
            if (authoredStr != null) {
              final authoredDate = DateTime.parse(authoredStr);
              final ageHours = now.difference(authoredDate).inHours;
              
              bool isStalled = false;
              String priority = 'ROUTINE';
              
              if (task['priority'] == 'stat' && ageHours > 1) {
                isStalled = true;
                priority = 'EMERGENCY';
              } else if (task['priority'] == 'urgent' && ageHours > 24) {
                isStalled = true;
                priority = 'HIGH';
              } else if (ageHours > 72) {
                isStalled = true;
              }

              if (isStalled) {
                final forRef = task['for']?['reference'] as String? ?? 'Unknown';
                gaps.add(CareGap(
                  type: 'STALLED_REFERRAL',
                  priority: priority,
                  patientId: forRef.replaceAll('Patient/', ''),
                  resourceId: task['id'] ?? record.id,
                  description: 'Referral stalled for \$ageHours hours',
                  ageInDays: ageHours / 24.0,
                ));
              }
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Failed to evaluate stalled referrals: \$e');
    }

    // 3. Overdue Follow-ups
    try {
      final carePlans = await (_db.select(_db.localResources)
            ..where((t) => t.resourceType.equals('CarePlan'))
            ..where((t) => t.isDeleted.equals(false)))
          .get();

      for (var record in carePlans) {
        final cp = jsonDecode(record.jsonPayload);
        if (cp['status'] == 'active') {
          final careTeam = cp['careTeam'] as List?;
          final isAssigned = careTeam?.any((ref) => ref['reference'] == 'Organization/\$facilityId') ?? false;
          
          if (isAssigned) {
            final createdStr = cp['created'];
            final createdDate = createdStr != null ? DateTime.parse(createdStr) : record.updatedAt;
            final ageDays = now.difference(createdDate).inHours / 24.0;
            
            if (ageDays > 3) {
              final subjectRef = cp['subject']?['reference'] as String? ?? 'Unknown';
              gaps.add(CareGap(
                type: 'OVERDUE_FOLLOWUP',
                priority: 'HIGH',
                patientId: subjectRef.replaceAll('Patient/', ''),
                resourceId: cp['id'] ?? record.id,
                description: 'Follow-up overdue by \${ageDays.round()} days',
                ageInDays: ageDays,
              ));
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Failed to evaluate overdue follow-ups: \$e');
    }

    // Sort by priority (EMERGENCY > HIGH > ROUTINE) and then age
    gaps.sort((a, b) {
      const pmap = {'EMERGENCY': 3, 'HIGH': 2, 'ROUTINE': 1};
      final pA = pmap[a.priority] ?? 1;
      final pB = pmap[b.priority] ?? 1;
      if (pA != pB) {
        return pB - pA;
      }
      return b.ageInDays.compareTo(a.ageInDays);
    });

    return gaps;
  }
}
