const mongoose = require('mongoose');
const CommuteLog = require('../models/commuteLogs');

describe('CommuteLog model tests', () => {
  beforeAll(async () => {
    // Connect to the MongoDB database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Disconnect from the MongoDB database
    await mongoose.connection.close();
  });

  test('Mark a commute log as reimbursed', async () => {
    // Create a test commute log
    const testCommuteLog = new CommuteLog({
      loggedInUser: '646c3c8a98b03b7d5c9c4b22',
      openingReadingKM: 1234,
      openingReadingKMPhoto: null, // You may need to provide a valid image buffer or ObjectId
      closingReadingKM: 1250,
      closingReadingKMPhoto: null, // You may need to provide a valid image buffer or ObjectId
      selphiPhoto: null, // You may need to provide a valid image buffer or ObjectId
      siteName: 'Test Site',
      loggedInUserName: 'John Doe',
      vehicle: 'ABC123',
      ratePerKM: 5.0,
      runningKM: 16,
      amount: 80.0,
      reimbursed: false,
    });

    // Save the test commute log
    const savedCommuteLog = await testCommuteLog.save();

    // Mark the commute log as reimbursed
    savedCommuteLog.reimbursed = true;
    const updatedCommuteLog = await savedCommuteLog.save();

    // Assert that the reimbursed field is set to true
    expect(updatedCommuteLog.reimbursed).toBe(true);
  });
});
