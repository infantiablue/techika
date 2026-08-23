import Link from "next/link";
import { Header } from "../components/site";
import { getPosts } from "../lib/posts";

function formatDate(date) {
	return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default function Home() {
	const [featured, ...writing] = getPosts();
	return (
		<>
			<Header />
			<main className='home'>
				<section className='home-intro'>
					<p className='eyebrow'>Personal journal</p>
					<h1>
						Truong Phan —<br />
						developer, writer,
						<br />
						lifelong learner.
					</h1>
				</section>
				<section className='featured'>
					<div className='featured-meta'>
						<strong>Featured</strong>
						<time dateTime={featured.date}>{formatDate(featured.date)}</time>
					</div>
					<article>
						<h2>
							<Link href={featured.path}>{featured.title}</Link>
						</h2>
						<p>{featured.description}</p>
						<Link className='arrow-link' href={featured.path}>
							Read <span aria-hidden='true'>→</span>
						</Link>
					</article>
				</section>
				<section className='selected-writing'>
					<h2>Selected writing</h2>
					<div>
						{writing.slice(0, 5).map((post) => (
							<article key={post.path}>
								<Link href={post.path}>{post.title}</Link>
								<time dateTime={post.date}>{formatDate(post.date)}</time>
							</article>
						))}
					</div>
				</section>
				<footer className='home-footer'>
					<a href='https://github.com/infantiablue'>GitHub</a>
					<Link href='/contact'>Contact</Link>
				</footer>
			</main>
		</>
	);
}
