import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import AdminRoute from "../components/admin-route";
import ProtectedRoute from "../components/protected-route";

const App = lazy(() => import("../App"));
const Admin = lazy(() => import("../pages/admin"));
const AlbumDetail = lazy(() => import("../pages/album-detail"));
const ArtistDetail = lazy(() => import("../pages/artist-detail"));
const Feed = lazy(() => import("../pages/feed"));
const ForgotPassword = lazy(() => import("../pages/forgot-password"));
const Home = lazy(() => import("../pages/home"));
const ListDetail = lazy(() => import("../pages/list-detail"));
const Lists = lazy(() => import("../pages/lists"));
const Login = lazy(() => import("../pages/login"));
const NotFound = lazy(() => import("../pages/notfound"));
const Notifications = lazy(() => import("../pages/notifications"));
const Profile = lazy(() => import("../pages/profile"));
const PublicProfile = lazy(() => import("../pages/public-profile"));
const Register = lazy(() => import("../pages/register"));
const ResetPassword = lazy(() => import("../pages/reset-password"));
const ReviewDetail = lazy(() => import("../pages/review-detail"));
const Reviews = lazy(() => import("../pages/reviews"));
const ReleaseReviews = lazy(() => import("../pages/release-reviews"));
const Search = lazy(() => import("../pages/search"));

const secure = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

function RouteLoading() {
  return <main className="route-loading" role="status" aria-live="polite"><img src="/images/musimo.png" alt="" aria-hidden="true" /><span>Cargando musimo…</span></main>;
}

function LegacyRedirect({ to }) {
  const location = useLocation();
  const params = useParams();
  const target = typeof to === "function" ? to(params) : to;
  const query = new URLSearchParams(location.search);
  const keyAliases = { new: "nueva", edit: "editar", release: "lanzamiento", category: "categoria", q: "consulta", saved: "guardada" };
  Object.entries(keyAliases).forEach(([previous, next]) => {
    if (!query.has(previous)) return;
    query.set(next, query.get(previous));
    query.delete(previous);
  });
  const categoryAliases = { all: "todo", releases: "lanzamientos", artists: "artistas", people: "usuarios", lists: "listas" };
  if (query.has("categoria")) query.set("categoria", categoryAliases[query.get("categoria")] || query.get("categoria"));
  const translatedSearch = query.size ? `?${query}` : "";
  return <Navigate to={`${target}${translatedSearch}${location.hash}`} replace />;
}


function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const titles = [
      [/^\/$/, "musimo · Música, significado y momentos"],
      [/^\/iniciar-sesion/, "Iniciar sesión · musimo"],
      [/^\/registro/, "Crear cuenta · musimo"],
      [/^\/recuperar-contrasena|^\/restablecer-contrasena/, "Recuperar contraseña · musimo"],
      [/^\/inicio/, "Inicio · musimo"],
      [/^\/buscar/, "Descubrir · musimo"],
      [/^\/comunidad/, "Comunidad · musimo"],
      [/^\/lanzamiento/, "Lanzamiento · musimo"],
      [/^\/artista/, "Artista · musimo"],
      [/^\/resena/, "Reseñas · musimo"],
      [/^\/lista/, "Listas · musimo"],
      [/^\/usuario|^\/perfil/, "Perfil · musimo"],
      [/^\/notificaciones/, "Notificaciones · musimo"],
      [/^\/administracion/, "Administración · musimo"],
    ];
    document.title = titles.find(([pattern]) => pattern.test(pathname))?.[1] || "Página no encontrada · musimo";
  }, [pathname]);

  return null;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
}

export default function Router() {
  return <BrowserRouter><DocumentTitle /><ScrollToTop /><Suspense fallback={<RouteLoading />}><Routes>
    <Route path="/" element={<App />} />
    <Route path="/iniciar-sesion" element={<Login />} />
    <Route path="/registro" element={<Register />} />
    <Route path="/recuperar-contrasena" element={<ForgotPassword />} />
    <Route path="/restablecer-contrasena" element={<ResetPassword />} />
    <Route path="/inicio" element={secure(<Home />)} />
    <Route path="/buscar" element={secure(<Search />)} />
    <Route path="/lanzamiento/:slug/resenas" element={secure(<ReleaseReviews />)} />
    <Route path="/lanzamiento/id/:id/resenas" element={secure(<ReleaseReviews />)} />
    <Route path="/lanzamiento/id/:id/:slug/resenas" element={secure(<ReleaseReviews />)} />
    <Route path="/lanzamiento/:slug" element={secure(<AlbumDetail />)} />
    <Route path="/lanzamiento/id/:id/:slug?" element={secure(<AlbumDetail />)} />
    <Route path="/artista/:slug" element={secure(<ArtistDetail />)} />
    <Route path="/artista/id/:id/:slug?" element={secure(<ArtistDetail />)} />
    <Route path="/resenas" element={secure(<Reviews />)} />
    <Route path="/resena/:id" element={secure(<ReviewDetail />)} />
    <Route path="/listas" element={secure(<Lists />)} />
    <Route path="/lista/:id" element={secure(<ListDetail />)} />
    <Route path="/perfil" element={secure(<Profile />)} />
    <Route path="/usuario/:handle" element={secure(<PublicProfile />)} />
    <Route path="/comunidad" element={secure(<Feed />)} />
    <Route path="/notificaciones" element={secure(<Notifications />)} />
    <Route path="/administracion" element={<AdminRoute><Admin /></AdminRoute>} />

    <Route path="/login" element={<LegacyRedirect to="/iniciar-sesion" />} />
    <Route path="/register" element={<LegacyRedirect to="/registro" />} />
    <Route path="/forgot-password" element={<LegacyRedirect to="/recuperar-contrasena" />} />
    <Route path="/reset-password" element={<LegacyRedirect to="/restablecer-contrasena" />} />
    <Route path="/home" element={<LegacyRedirect to="/inicio" />} />
    <Route path="/search" element={<LegacyRedirect to="/buscar" />} />
    <Route path="/release/:id/:slug?" element={<LegacyRedirect to={({ id, slug }) => `/lanzamiento/id/${id}${slug ? `/${slug}` : ""}`} />} />
    <Route path="/album/:slug" element={<LegacyRedirect to={({ slug }) => `/lanzamiento/${slug}`} />} />
    <Route path="/artist/:id/:slug?" element={<LegacyRedirect to={({ id, slug }) => `/artista/id/${id}${slug ? `/${slug}` : ""}`} />} />
    <Route path="/reviews" element={<LegacyRedirect to="/resenas" />} />
    <Route path="/review/:id" element={<LegacyRedirect to={({ id }) => `/resena/${id}`} />} />
    <Route path="/lists" element={<LegacyRedirect to="/listas" />} />
    <Route path="/list/:id" element={<LegacyRedirect to={({ id }) => `/lista/${id}`} />} />
    <Route path="/profile" element={<LegacyRedirect to="/perfil" />} />
    <Route path="/u/:handle" element={<LegacyRedirect to={({ handle }) => `/usuario/${handle}`} />} />
    <Route path="/seguidos" element={<LegacyRedirect to="/comunidad" />} />
    <Route path="/feed" element={<LegacyRedirect to="/comunidad" />} />
    <Route path="/notifications" element={<LegacyRedirect to="/notificaciones" />} />
    <Route path="/settings" element={<LegacyRedirect to="/perfil" />} />
    <Route path="/admin" element={<LegacyRedirect to="/administracion" />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense></BrowserRouter>;
}
