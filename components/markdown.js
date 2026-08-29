import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
export function Markdown({ children, highlightCode = true }) { return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={highlightCode ? [rehypeRaw, rehypeHighlight] : [rehypeRaw]} components={{ img: ({ alt = "", ...props }) => <img {...props} alt={alt} loading="lazy" decoding="async" />, pre: ({ children: code, ...props }) => <pre {...props} suppressHydrationWarning={!highlightCode}>{code}</pre> }}>{children}</ReactMarkdown>; }
