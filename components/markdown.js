import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
export function Markdown({ children }) { return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]} components={{ img: ({ alt = "", ...props }) => <img {...props} alt={alt} loading="lazy" decoding="async" /> }}>{children}</ReactMarkdown>; }
