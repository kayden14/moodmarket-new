import { emailService } from './services/emailService';

async function test() {
  console.log('Sending test email...');
  await emailService.orderPlaced(
    'test@example.com',
    'John Doe',
    'ORD-123456',
    150.50,
    3,
    'Mobile Money',
    '123 Test St, Accra',
    '0244000000'
  );
  console.log('Done!');
}
test();
