import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_supabase import SupabaseVectorStore
from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain_community.document_loaders import DirectoryLoader, TextLoader

load_dotenv()

# Load data from MD files
loader = DirectoryLoader('data', glob="*.md", loader_cls=TextLoader)
docs = loader.load()

# Split into chunks (max 500 chars)
splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[("#", "Header 1"), ("##", "Header 2")],
    strip_headers=False
)
chunks = []
for doc in docs:
    split_docs = splitter.split_text(doc.page_content)
    for split in split_docs:
        if len(split.page_content) > 500:
            # Further split if >500
            char_splitter = splitter.__class__(chunk_size=500, chunk_overlap=50)
            chunks.extend(char_splitter.split_text(split.page_content))
        else:
            chunks.append(split)

# Embed with Gemini
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=os.getenv("GOOGLE_API_KEY"))

# Store in Supabase
vector_store = SupabaseVectorStore(
    embedding=embeddings,
    client=supabase.Client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY")),
    table_name="company_vectors",
    query_name="match_documents"  # Create match function if needed (see Supabase docs)
)
vector_store.add_documents(chunks)
print("Data loaded!")