import assert from 'node:assert/strict';
import {
  formatMembershipPackageLabel,
  normalizeLawyerPackageType,
  normalizeMembershipDisplayPackageType,
  normalizeMembershipRecordPackageType,
} from '../src/lib/admin/membership-package';

assert.equal(
  normalizeMembershipRecordPackageType('civil_premium'),
  'civil',
  'civil premium should persist as civil in membership_records'
);

assert.equal(
  normalizeMembershipRecordPackageType('criminal_premium'),
  'criminal',
  'criminal premium should persist as criminal in membership_records'
);

assert.equal(
  normalizeMembershipRecordPackageType('civil'),
  'civil',
  'civil should stay civil'
);

assert.equal(
  normalizeMembershipRecordPackageType('criminal'),
  'criminal',
  'criminal should stay criminal'
);

assert.equal(
  normalizeLawyerPackageType('civil'),
  'civil_premium',
  'civil membership actions should keep lawyers table on premium value'
);

assert.equal(
  normalizeLawyerPackageType('criminal'),
  'criminal_premium',
  'criminal membership actions should keep lawyers table on premium value'
);

assert.equal(
  normalizeMembershipDisplayPackageType('civil_premium'),
  'civil',
  'civil premium should display as civil in admin labels'
);

assert.equal(
  normalizeMembershipDisplayPackageType('criminal_premium'),
  'criminal',
  'criminal premium should display as criminal in admin labels'
);

assert.equal(
  formatMembershipPackageLabel('civil_premium'),
  '民事臻选',
  'civil premium should render the civil membership label'
);

assert.equal(
  formatMembershipPackageLabel('criminal_premium'),
  '刑事臻选',
  'criminal premium should render the criminal membership label'
);

console.log('admin members package normalization test passed');
