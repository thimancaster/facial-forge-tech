import { Link } from "react-router-dom";

const NotFound = () => {
  // Removed console.error - 404s are already logged by web server
  // No sensitive path information exposed in production

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
