import { Redirect } from "expo-router";

// simple redirect from root to login
export default function Index() {
  return <Redirect href="/login" />;
}
