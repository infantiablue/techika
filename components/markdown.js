import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
export function Markdown({ children }) { return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{ img: ({ alt = "", ...props }) => <img {...props} alt={alt} loading="lazy" decoding="async" /> }}>{children}</ReactMarkdown>; }
