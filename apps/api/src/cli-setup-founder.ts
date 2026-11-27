import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import * as readline from 'readline';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runCliBootstrap() {
  console.log('\n======================================================');
  console.log('   SEG Academy CRM — First-Time Founder Setup CLI    ');
  console.log('======================================================\n');

  // Disable Nest banner/logging noise
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const authService = app.get(AuthService);

    // 1. Check existing status
    const status = await authService.getSetupStatus();
    if (status.initialized) {
      console.error('❌ Setup Error: System is already initialized.');
      console.error('A Founder / Super Admin account already exists.\n');
      process.exit(1);
    }

    console.log('No Founder account detected. Please provide initial administrator details:\n');

    const fullName = await askQuestion('Founder Full Name (e.g. Dr. Sarah Jenkins): ');
    if (!fullName || fullName.length < 2) {
      console.error('❌ Error: Full name must be at least 2 characters long.');
      process.exit(1);
    }

    const email = await askQuestion('Official Email Address: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Error: A valid official email address is required.');
      process.exit(1);
    }

    const password = await askQuestion('Secure Password (min 10 chars, uppercase, lowercase, digit, special char): ');
    if (
      !password ||
      password.length < 10 ||
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)
    ) {
      console.error(
        '❌ Error: Password must be at least 10 characters long and contain uppercase, lowercase, number, and special character.',
      );
      process.exit(1);
    }

    console.log('\nHashing credentials with Argon2id and registering Founder account...');

    const result = await authService.setupFounder(
      {
        fullName,
        email,
        password,
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'SEG-CRM-CLI-Bootstrap/1.0',
      },
    );

    console.log('\n✅ Founder / Super Admin Account Successfully Created!');
    console.log('------------------------------------------------------');
    console.log(`User ID   : ${result.user.id}`);
    console.log(`Full Name : ${result.user.fullName}`);
    console.log(`Email     : ${result.user.email}`);
    console.log(`Role Code : ${result.user.role.code}`);
    console.log('------------------------------------------------------');
    console.log('You can now log in at http://localhost:3000/login\n');
  } catch (err: any) {
    console.error('\n❌ Setup failed:', err?.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runCliBootstrap();
