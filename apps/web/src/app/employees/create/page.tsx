'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  organizationService,
  Department,
  Team,
  ProfileEmployee,
  EmploymentType,
} from '@/lib/api/organization';
import {
  ArrowLeft,
  UserSquare2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building2,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';

function CreateEmployeeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDeptId = searchParams.get('departmentId') || '';
  const initialTeamId = searchParams.get('teamId') || '';

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [departmentId, setDepartmentId] = useState(initialDeptId);
  const [teamId, setTeamId] = useState(initialTeamId);
  const [managerId, setManagerId] = useState('');
  const [roleCode, setRoleCode] = useState('TRAINER_FACULTY');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [joinDate, setJoinDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  // Intern Extension State
  const [mentorId, setMentorId] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [academicDegree, setAcademicDegree] = useState('');
  const [internEndDate, setInternEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });

  // Prerequisites
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<ProfileEmployee[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [depts, allTeams, staff] = await Promise.all([
          organizationService.getDepartments(),
          organizationService.getTeams(),
          organizationService.getEmployees(),
        ]);
        setDepartments(depts);
        setTeams(allTeams);
        setEmployees(staff);

        if (!departmentId && depts.length > 0) {
          setDepartmentId(depts[0].id);
        }
      } catch {}
    };
    loadPrerequisites();
  }, []);

  // Filter teams by selected department
  const filteredTeams = teams.filter((t) => t.departmentId === departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid corporate email address is required.');
      return;
    }
    if (!jobTitle.trim()) {
      setErrorMessage('Job title / designation is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await organizationService.createEmployee({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim() || undefined,
        employeeCode: employeeCode.trim().toUpperCase() || undefined,
        jobTitle: jobTitle.trim(),
        employmentType,
        departmentId: departmentId || undefined,
        teamId: teamId || undefined,
        managerId: managerId || undefined,
        roleCode,
        joinDate,
        internDetails:
          employmentType === 'INTERN'
            ? {
                mentorId: mentorId || undefined,
                startDate: joinDate,
                endDate: internEndDate,
                collegeName: collegeName.trim() || undefined,
                academicDegree: academicDegree.trim() || undefined,
              }
            : undefined,
      });

      router.push(`/employees/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to onboard employee.');
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/employees" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Employees
          </Link>
          <span>/</span>
          <span className="text-foreground">Onboard Staff Member</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Onboard Faculty & Staff
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register an employee profile with organizational placement and system access roles
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Personal & Identity */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <UserSquare2 className="h-4 w-4 text-seg-plum" />
              1. Personal & Contact Identity
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Iyer, Ananya Deshmukh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Corporate Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. name@segacademy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Employee Code (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Leave blank to auto-generate (e.g. EMP-2026-0012)"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                  className="font-mono text-sm uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Organizational Placement */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-seg-plum" />
              2. Department, Team & Job Role
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setTeamId('');
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- No Department Assigned --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Team (Optional)
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- No Team Assigned --</option>
                  {filteredTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Job Title / Official Designation <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Lead Faculty - Cloud Architecture, Counselor"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Reporting Manager / Supervisor
                </label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- No Direct Manager --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode}) — {emp.jobTitle}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Privileges & Employment Terms */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-seg-plum" />
              3. Access Permissions & Employment Terms
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  System Role (RBAC) <span className="text-red-500">*</span>
                </label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                >
                  <option value="TRAINER_FACULTY">Faculty & Trainer</option>
                  <option value="TEAM_LEADER">Team Leader</option>
                  <option value="EMPLOYEE_INTERN">Employee / Intern</option>
                  <option value="FINANCE_MANAGER">Finance Manager</option>
                  <option value="ADMIN">System Administrator</option>
                  <option value="FOUNDER_SUPER_ADMIN">Founder & Super Admin</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Employment Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                >
                  <option value="FULL_TIME">Full-time Staff</option>
                  <option value="PART_TIME">Part-time Staff</option>
                  <option value="CONTRACT">Contractor</option>
                  <option value="INTERN">Intern Cohort</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Joining Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 4: Intern Extension (Conditional) */}
          {employmentType === 'INTERN' && (
            <div className="rounded-xl border border-seg-plum/40 bg-seg-plum-subtle/30 p-5 shadow-sm space-y-4 dark:bg-seg-plum/10">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-seg-plum" />
                4. Internship Track Details
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Assigned Faculty Mentor
                  </label>
                  <select
                    value={mentorId}
                    onChange={(e) => setMentorId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">-- Select Senior Mentor --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeCode}) — {emp.jobTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Internship End Date
                  </label>
                  <Input
                    type="date"
                    value={internEndDate}
                    onChange={(e) => setInternEndDate(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    College / University Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. VJTI Mumbai, BITS Pilani, IIT Bombay"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Degree & Specialization
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. B.Tech Computer Engineering, M.Sc Data Science"
                    value={academicDegree}
                    onChange={(e) => setAcademicDegree(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <Link href="/employees">
              <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !fullName.trim() || !email.trim() || !jobTitle.trim()}
              className="bg-seg-plum text-white hover:bg-seg-plum-hover"
            >
              {isSubmitting ? (
                'Onboarding...'
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Save & Onboard Employee
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function CreateEmployeePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
        </div>
      }
    >
      <CreateEmployeeContent />
    </Suspense>
  );
}
