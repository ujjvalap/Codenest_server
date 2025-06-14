export const getServerTime = (req, res) => {
    const serverTime = new Date().toISOString();  // Get current UTC time
    res.status(200).json({ utc_datetime: serverTime });
  };