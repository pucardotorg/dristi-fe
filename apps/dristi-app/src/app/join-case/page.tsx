import { redirect } from "next/navigation";

/**
 * Join a case is no longer a page: it is the one strong action on the Cases page,
 * whose whole journey runs in a dialog over that list. The route stays so an old
 * link or bookmark still lands somewhere that can do the thing it promised.
 */
export default function JoinCaseRedirect() {
  redirect("/cases");
}
