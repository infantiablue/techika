import Link from "next/link";
import Image from "next/image";
import { Header } from "../components/site";
import { getPosts, selectFeaturedPost } from "../lib/posts";
import { coverSize } from "../lib/media-rules";

function formatDate(date) {
	return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default function Home() {
	const posts = getPosts();
	const featured = selectFeaturedPost(posts);
	const writing = posts.filter((post) => post.slug !== featured.slug);
	return (
		<>
			<Header />
			<main className='home' id='main-content'>
				<section className='home-intro'>
					<p className='eyebrow'>Personal journal</p>
					<h1>
						Truong Phan —<br />
						developer, writer,
						<br />
						lifelong learner.
					</h1>
					<nav className='home-socials' aria-label='Find Truong Phan online'>
						<a href='https://x.com/infantiablue'><span>X</span><strong>@infantiablue</strong><b aria-hidden='true'>↗</b></a>
						<a href='https://github.com/infantiablue'><span>GitHub</span><strong>infantiablue</strong><b aria-hidden='true'>↗</b></a>
					</nav>
				</section>
				<section className='featured'>
					{featured.image && <Link className='featured-cover' href={featured.path} aria-label={`Read ${featured.title}`}><Image src={featured.image} alt='' {...coverSize} sizes="(max-width: 1018px) calc(100vw - 3rem), 970px" priority /></Link>}
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
					<Link href='/contact'>Contact</Link>
				</footer>
			</main>
		</>
	);
}
