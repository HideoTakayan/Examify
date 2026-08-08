import { getAdminSystemReport } from "~/models/adminSystemReport.model";

export const getSystemReport = async () => {
  return getAdminSystemReport();
};
