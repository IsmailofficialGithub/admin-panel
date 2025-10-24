import nodemailer from "nodemailer";

const user=process.env.AdminEmail;
const pass=process.env.Nodemailer_Google_App_Password;
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user,
    pass,
  },
});