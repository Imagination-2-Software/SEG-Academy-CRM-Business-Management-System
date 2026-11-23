'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { apiClient, ApiClientError } from '@/lib/api';
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
      const payload: any = {
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

      const res = await apiClient.post('/students', payload);
      if (res.success && res.data) {
        router.push(`/students/${res.data.id}`);
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
                    <label className="text-xs font-semibold text-foreground">
                      Full Legal Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="fullName"
                      placeholder="e.g. Aarav Sharma"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="aarav.sharma@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Phone Number
                    </label>
                    <Input
                      name="phoneNumber"
                      placeholder="+91 98765 43210"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Date of Birth
                    </label>
                    <Input
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Gender
                    </label>
                    <Input
                      name="gender"
                      placeholder="Male / Female / Other"
                      value={formData.gender}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Nationality
                    </label>
                    <Input
                      name="nationality"
                      placeholder="Indian"
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
                    <label className="text-xs font-semibold text-foreground">
                      Address Line 1
                    </label>
                    <Input
                      name="addressLine1"
                      placeholder="Building, street, or flat number"
                      value={formData.addressLine1}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">
                      Address Line 2
                    </label>
                    <Input
                      name="addressLine2"
                      placeholder="Landmark or locality"
                      value={formData.addressLine2}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      City
                    </label>
                    <Input
                      name="city"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      State / Province
                    </label>
                    <Input
                      name="state"
                      placeholder="e.g. Maharashtra"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Country
                    </label>
                    <Input
                      name="country"
                      placeholder="India"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Postal Code
                    </label>
                    <Input
                      name="postalCode"
                      placeholder="400001"
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
                    <label className="text-xs font-semibold text-foreground">
                      Guardian Name
                    </label>
                    <Input
                      name="guardianName"
                      placeholder="Parent or guardian name"
                      value={formData.guardianName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Guardian Phone
                    </label>
                    <Input
                      name="guardianPhone"
                      placeholder="+91 98765 43212"
                      value={formData.guardianPhone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Guardian Email
                    </label>
                    <Input
                      name="guardianEmail"
                      type="email"
                      placeholder="guardian@example.com"
                      value={formData.guardianEmail}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Emergency Contact Number
                    </label>
                    <Input
                      name="emergencyContact"
                      placeholder="+91 98765 43211"
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
