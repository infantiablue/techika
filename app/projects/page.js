import { getStaticPage, StaticPage } from "../../components/static-page";
export const metadata = { title: "Projects", description: "A selection of open-source web development projects by Truong Phan.", alternates: { canonical: "/projects/" }, openGraph: { url: "/projects/" } };
export default function Projects() { return <StaticPage page="projects" />; }
