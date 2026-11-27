'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { studentsService } from '@/lib/api/students';
import { ApiClientError } from '@/lib/api/client';
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterStudentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'Male',
    nationality: 'Indian',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    emergencyContact: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.fullName || !formData.email) {
      setErrorMessage('Full name and email address are required.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        nationality: formData.nationality || undefined,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        postalCode: formData.postalCode || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        guardianName: formData.guardianName || undefined,
        guardianPhone: formData.guardianPhone || undefined,
        guardianEmail: formData.guardianEmail || undefined,
      };

      const newStudent = await studentsService.registerStudent(payload);
      if (newStudent && newStudent.id) {
        router.push(`/students/${newStudent.id}`);
      }
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to register student. Please check input parameters.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell requiredPermission="students:create">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <Link href="/students">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Register New Student
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Student Profile Details</CardTitle>
              <CardDescription>
                Provide primary contact, demographic, and guardian details. An authoritative Student Code (SEG-YY-XXXX) will be generated automatically.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Section 1: Personal Info */}
              <div>
                <h3 className="text-sm font-semibold text-seg-plum mb-3 border-b border-border pb-1">
                  1. Personal & Contact Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="student-full-name" className="text-xs font-semibold text-foreground">
                      Full Legal Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="student-full-name"
                      name="fullName"
                      placeholder="XYZ"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-email" className="text-xs font-semibold text-foreground">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="student-email"
                      name="email"
                      type="email"
                      placeholder="xyz@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-phone" className="text-xs font-semibold text-foreground">
                      Phone Number
                    </label>
                    <Input
                      id="student-phone"
                      name="phoneNumber"
                      placeholder="123"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-dob" className="text-xs font-semibold text-foreground">
                      Date of Birth
                    </label>
                    <Input
                      id="student-dob"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-gender" className="text-xs font-semibold text-foreground">
                      Gender
                    </label>
                    <Input
                      id="student-gender"
                      name="gender"
                      placeholder="Male / Female / Other"
                      value={formData.gender}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-nationality" className="text-xs font-semibold text-foreground">
                      Nationality
                    </label>
                    <Input
                      id="student-nationality"
                      name="nationality"
                      placeholder="XYZ"
                      value={formData.nationality}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Residential Address */}
              <div>
                <h3 className="text-sm font-semibold text-seg-plum mb-3 border-b border-border pb-1">
                  2. Residential Address
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="student-address1" className="text-xs font-semibold text-foreground">
                      Address Line 1
                    </label>
                    <Input
                      id="student-address1"
                      name="addressLine1"
                      placeholder="XYZ"
                      value={formData.addressLine1}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="student-address2" className="text-xs font-semibold text-foreground">
                      Address Line 2
                    </label>
                    <Input
                      id="student-address2"
                      name="addressLine2"
                      placeholder="XYZ"
                      value={formData.addressLine2}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-city" className="text-xs font-semibold text-foreground">
                      City
                    </label>
                    <Input
                      id="student-city"
                      name="city"
                      placeholder="XYZ"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-state" className="text-xs font-semibold text-foreground">
                      State / Province
                    </label>
                    <Input
                      id="student-state"
                      name="state"
                      placeholder="XYZ"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-country" className="text-xs font-semibold text-foreground">
                      Country
                    </label>
                    <Input
                      id="student-country"
                      name="country"
                      placeholder="XYZ"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-postal-code" className="text-xs font-semibold text-foreground">
                      Postal Code
                    </label>
                    <Input
                      id="student-postal-code"
                      name="postalCode"
                      placeholder="123"
                      value={formData.postalCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Guardian & Emergency Contact */}
              <div>
                <h3 className="text-sm font-semibold text-seg-plum mb-3 border-b border-border pb-1">
                  3. Guardian & Emergency Contacts
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="student-guardian-name" className="text-xs font-semibold text-foreground">
                      Guardian Name
                    </label>
                    <Input
                      id="student-guardian-name"
                      name="guardianName"
                      placeholder="XYZ"
                      value={formData.guardianName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-guardian-phone" className="text-xs font-semibold text-foreground">
                      Guardian Phone
                    </label>
                    <Input
                      id="student-guardian-phone"
                      name="guardianPhone"
                      placeholder="123"
                      value={formData.guardianPhone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-guardian-email" className="text-xs font-semibold text-foreground">
                      Guardian Email
                    </label>
                    <Input
                      id="student-guardian-email"
                      name="guardianEmail"
                      type="email"
                      placeholder="xyz@example.com"
                      value={formData.guardianEmail}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="student-emergency-contact" className="text-xs font-semibold text-foreground">
                      Emergency Contact Number
                    </label>
                    <Input
                      id="student-emergency-contact"
                      name="emergencyContact"
                      placeholder="123"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 border-t border-border p-4">
              <Link href="/students">
                <Button variant="outline" type="button" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                className="bg-seg-plum text-white hover:bg-seg-plum-hover"
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Creating Record...' : 'Register Student'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}
