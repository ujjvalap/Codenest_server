import mongoose from 'mongoose'

const Schema = mongoose.Schema;

const leaderboardSchema = new Schema({
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        totalScore: { type: Number, default: 0 },
        timeTaken: { type: Number, default: 0 },
      }
    ],
    updatedAt: { type: Date, default: Date.now },
  });
  
  const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
  export default Leaderboard;
  