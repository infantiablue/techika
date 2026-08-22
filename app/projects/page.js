import { getStaticPage, StaticPage } from "../../components/static-page";
export const metadata = { title: "My Projects", alternates: { canonical: "/projects" } };
export default function Projects() { return <StaticPage page="projects" />; }
