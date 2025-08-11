import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_supabase import SupabaseVectorStore
from langchain_core.prompts import PromptTemplate
from langchain.chains import RetrievalQA
import supabase

load_dotenv()

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup RAG
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
vector_store = SupabaseVectorStore(
    embedding=embeddings,
    client=supabase.Client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY")),
    table_name="company_vectors",
    query_name="match_documents"
)
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.7)
retriever = vector_store.as_retriever(search_kwargs={"k": 3})  # Retrieve top 3 chunks

prompt = PromptTemplate(
    template="You are a helpful company info bot. Use the following context to answer: {context}\nQuestion: {question}\nAnswer:",
    input_variables=["context", "question"]
)
qa_chain = RetrievalQA.from_chain_type(llm=llm, chain_type="stuff", retriever=retriever, return_source_documents=True)

class Query(BaseModel):
    question: str

@app.post("/ask")
async def ask_question(query: Query):
    try:
        result = qa_chain({"query": query.question})
        return {"answer": result["result"], "sources": [doc.page_content[:100] for doc in result["source_documents"]]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# For auth (optional: employee login)
@app.post("/login")
async def login(email: str, password: str):
    client = supabase.Client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    response = client.auth.sign_in_with_password({"email": email, "password": password})
    return {"access_token": response.session.access_token}