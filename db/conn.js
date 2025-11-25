import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function main()
{
    await mongoose.connect(process.env.DB_URL);
    console.log("Conectou ao mongodb");
}
main().catch((err) => console.log(err))

export default mongoose;
