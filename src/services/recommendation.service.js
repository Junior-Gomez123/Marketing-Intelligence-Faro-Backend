import LinkedInActivity from "../models/LinkedInActivity.js";
import PostMetric from "../models/PostMetric.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(laterDate, earlierDate) {
  return Math.round((laterDate.getTime() - earlierDate.getTime()) / DAY_MS);
}

/**
 * Calcula metricas puras a partir de arrays de registros ya cargados.
 * Separado de la consulta a Mongo para poder testear sin base de datos.
 */
export function computeMetricsFromRecords({ posts = [], comments = [], reactions = [] }, now = new Date()) {
  const last30 = new Date(now.getTime() - 30 * DAY_MS);
  const last90 = new Date(now.getTime() - 90 * DAY_MS);

  const postDates = posts.map((p) => p.occurredAt).filter(Boolean).sort((a, b) => a - b);

  const totalPosts = posts.length;
  const postsLast30d = postDates.filter((d) => d >= last30).length;
  const postsLast90d = postDates.filter((d) => d >= last90).length;
  const lastPostDate = postDates.length ? postDates[postDates.length - 1] : null;
  const daysSinceLastPost = lastPostDate ? daysBetween(now, lastPostDate) : null;

  let longestGapDays = 0;
  for (let i = 1; i < postDates.length; i++) {
    const gap = daysBetween(postDates[i], postDates[i - 1]);
    if (gap > longestGapDays) longestGapDays = gap;
  }

  const engagementGivenDates = [...comments, ...reactions]
    .map((a) => a.occurredAt)
    .filter(Boolean)
    .sort((a, b) => a - b);

  const totalEngagementGiven = comments.length + reactions.length;
  const engagementGivenLast30d = engagementGivenDates.filter((d) => d >= last30).length;
  const lastEngagementDate = engagementGivenDates.length
    ? engagementGivenDates[engagementGivenDates.length - 1]
    : null;
  const daysSinceLastEngagement = lastEngagementDate ? daysBetween(now, lastEngagementDate) : null;

  const postsWithText = posts.filter((p) => p.text && p.text.trim().length > 0);
  const avgPostLength = postsWithText.length
    ? Math.round(postsWithText.reduce((sum, p) => sum + p.text.length, 0) / postsWithText.length)
    : 0;

  const postsWithMedia = posts.filter((p) => p.mediaUrl && p.mediaUrl.trim().length > 0);
  const mediaPostsPct = totalPosts ? Math.round((postsWithMedia.length / totalPosts) * 100) : 0;

  return {
    totalPosts,
    postsLast30d,
    postsLast90d,
    lastPostDate,
    daysSinceLastPost,
    longestGapDays,
    totalEngagementGiven,
    engagementGivenLast30d,
    lastEngagementDate,
    daysSinceLastEngagement,
    avgPostLength,
    mediaPostsPct,
  };
}

/**
 * Metricas de alcance/audiencia derivadas de los PostMetric cargados a mano
 * (impresiones, alcance, % seguidores, reacciones/comentarios/reposts que
 * LinkedIn SI te muestra en "Ver analisis" de cada post pero no exporta).
 */
export function computePostMetricStats(postMetrics = []) {
  const withImpressions = postMetrics.filter((p) => typeof p.impressions === "number" && p.impressions !== null);
  const avgImpressions = withImpressions.length
    ? Math.round(withImpressions.reduce((sum, p) => sum + p.impressions, 0) / withImpressions.length)
    : null;

  const withReach = postMetrics.filter((p) => typeof p.membersReached === "number" && p.membersReached !== null);
  const avgMembersReached = withReach.length
    ? Math.round(withReach.reduce((sum, p) => sum + p.membersReached, 0) / withReach.length)
    : null;

  const withFollowerPct = postMetrics.filter((p) => typeof p.followerPct === "number" && p.followerPct !== null);
  const avgFollowerPct = withFollowerPct.length
    ? Math.round(withFollowerPct.reduce((sum, p) => sum + p.followerPct, 0) / withFollowerPct.length)
    : null;

  const withEngagementInputs = postMetrics.filter(
    (p) => typeof p.impressions === "number" && p.impressions > 0,
  );
  const avgEngagementRate = withEngagementInputs.length
    ? Math.round(
        (withEngagementInputs.reduce((sum, p) => {
          const engagement = (p.reactions || 0) + (p.comments || 0) + (p.reposts || 0);
          return sum + (engagement / p.impressions) * 100;
        }, 0) /
          withEngagementInputs.length) *
          10,
      ) / 10
    : null;

  // Tendencia de alcance: promedio de la primera mitad vs la segunda mitad,
  // ordenado por fecha del post. Necesita al menos 4 posts con alcance cargado.
  let reachTrendPct = null;
  const sortable = withReach
    .map((p) => ({ date: p.postDate || p.createdAt, reach: p.membersReached }))
    .filter((p) => p.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sortable.length >= 4) {
    const mid = Math.floor(sortable.length / 2);
    const older = sortable.slice(0, mid);
    const recent = sortable.slice(mid);
    const avgOlder = older.reduce((sum, p) => sum + p.reach, 0) / older.length;
    const avgRecent = recent.reduce((sum, p) => sum + p.reach, 0) / recent.length;
    if (avgOlder > 0) {
      reachTrendPct = Math.round(((avgRecent - avgOlder) / avgOlder) * 100);
    }
  }

  return {
    postMetricsCount: postMetrics.length,
    avgImpressions,
    avgMembersReached,
    avgFollowerPct,
    avgEngagementRate,
    reachTrendPct,
  };
}

// Cada regla recibe las metricas y devuelve una recomendacion o null si no aplica.
// Los umbrales son heuristicas generales de buenas practicas en LinkedIn, no una
// ciencia exacta -- se pueden ajustar facilmente aca.
const RULES = [
  (m) => {
    if (m.totalPosts === 0) {
      return {
        area: "publicaciones",
        status: "improvement",
        title: "Todavia no hay publicaciones importadas",
        detail: "No encontramos posts en tu historial. Sin eso no podemos evaluar tu cadencia de publicacion.",
      };
    }
    if (m.postsLast30d >= 4) {
      return {
        area: "publicaciones",
        status: "strength",
        title: "Publicas con buena frecuencia",
        detail: `${m.postsLast30d} publicaciones en los ultimos 30 dias (aprox. 1 por semana o mas).`,
      };
    }
    if (m.postsLast30d >= 1) {
      return {
        area: "publicaciones",
        status: "improvement",
        title: "Podrias publicar mas seguido",
        detail: `Solo ${m.postsLast30d} publicacion(es) en los ultimos 30 dias. Publicar 2-4 veces por semana suele dar mas alcance.`,
      };
    }
    return {
      area: "publicaciones",
      status: "improvement",
      title: "No publicaste nada en el ultimo mes",
      detail: `Tu ultima publicacion fue hace ${m.daysSinceLastPost} dias.`,
    };
  },

  (m) => {
    if (m.totalPosts < 3) return null;
    if (m.longestGapDays > 45) {
      return {
        area: "publicaciones",
        status: "improvement",
        title: "Tuviste una pausa larga entre publicaciones",
        detail: `El mayor espacio entre dos posts consecutivos fue de ${m.longestGapDays} dias.`,
      };
    }
    return {
      area: "publicaciones",
      status: "strength",
      title: "Publicas sin pausas largas",
      detail: `El mayor espacio entre publicaciones consecutivas fue de ${m.longestGapDays} dias.`,
    };
  },

  (m) => {
    if (m.engagementGivenLast30d >= 10) {
      return {
        area: "interaccion",
        status: "strength",
        title: "Interactuas activamente con tu red",
        detail: `${m.engagementGivenLast30d} reacciones/comentarios que diste en los ultimos 30 dias.`,
      };
    }
    if (m.engagementGivenLast30d >= 3) {
      return {
        area: "interaccion",
        status: "improvement",
        title: "Podrias interactuar mas con contenido de otros",
        detail: `Solo ${m.engagementGivenLast30d} reacciones/comentarios dados en los ultimos 30 dias. Comentar en tu red ayuda a que el algoritmo te muestre mas.`,
      };
    }
    return {
      area: "interaccion",
      status: "improvement",
      title: "Casi no interactuas con publicaciones de otros",
      detail: `${m.engagementGivenLast30d} reacciones/comentarios en los ultimos 30 dias.`,
    };
  },

  (m) => {
    if (m.totalPosts === 0) return null;
    if (m.mediaPostsPct >= 50) {
      return {
        area: "contenido",
        status: "strength",
        title: "Usas imagenes o video en tus posts",
        detail: `${m.mediaPostsPct}% de tus publicaciones tienen media adjunta.`,
      };
    }
    return {
      area: "contenido",
      status: "improvement",
      title: "Pocos posts con imagen o video",
      detail: `Solo ${m.mediaPostsPct}% de tus publicaciones tienen media adjunta. El contenido con imagen/video/documento suele tener mejor alcance.`,
    };
  },

  (m) => {
    if (m.totalPosts === 0) return null;
    if (m.avgPostLength < 80) {
      return {
        area: "contenido",
        status: "improvement",
        title: "Tus publicaciones son bastante cortas",
        detail: `Promedio de ${m.avgPostLength} caracteres. Desarrollar mas la idea suele generar mas conversacion.`,
      };
    }
    return {
      area: "contenido",
      status: "strength",
      title: "Tus publicaciones tienen buen desarrollo",
      detail: `Promedio de ${m.avgPostLength} caracteres por publicacion.`,
    };
  },

  // --- A partir de aca, reglas basadas en PostMetric (carga manual) ---

  (m) => {
    if (m.postMetricsCount === 0 || m.avgFollowerPct === null) return null;
    if (m.avgFollowerPct <= 40) {
      return {
        area: "alcance",
        status: "strength",
        title: "Tu contenido llega mas alla de tus seguidores",
        detail: `En promedio, solo el ${m.avgFollowerPct}% de quienes ven tus posts ya te seguian. El resto es alcance nuevo -- aprovechalo invitando a seguirte al cierre del post.`,
      };
    }
    if (m.avgFollowerPct >= 60) {
      return {
        area: "alcance",
        status: "improvement",
        title: "Tu alcance depende sobre todo de tus seguidores actuales",
        detail: `En promedio, el ${m.avgFollowerPct}% de las vistas ya te seguian. Para crecer, probar formatos que LinkedIn distribuya mas alla de tu red (hooks fuertes, temas de interes amplio, etiquetar personas relevantes).`,
      };
    }
    return {
      area: "alcance",
      status: "strength",
      title: "Buena mezcla entre seguidores y audiencia nueva",
      detail: `${m.avgFollowerPct}% de tus vistas promedio son de gente que ya te sigue; el resto es alcance nuevo.`,
    };
  },

  (m) => {
    if (m.reachTrendPct === null) return null;
    if (m.reachTrendPct >= 15) {
      return {
        area: "alcance",
        status: "strength",
        title: "Tu alcance esta creciendo",
        detail: `Tus posts mas recientes (con datos cargados) alcanzan en promedio ${m.reachTrendPct}% mas personas que los anteriores.`,
      };
    }
    if (m.reachTrendPct <= -15) {
      return {
        area: "alcance",
        status: "improvement",
        title: "Tu alcance viene cayendo",
        detail: `Tus posts mas recientes (con datos cargados) alcanzan en promedio ${Math.abs(m.reachTrendPct)}% menos personas que los anteriores.`,
      };
    }
    return null;
  },

  (m) => {
    if (m.avgEngagementRate === null) return null;
    if (m.avgEngagementRate >= 2) {
      return {
        area: "alcance",
        status: "strength",
        title: "Buena tasa de interaccion sobre tus impresiones",
        detail: `En promedio, ${m.avgEngagementRate}% de las veces que se muestra un post genera una reaccion, comentario o repost.`,
      };
    }
    if (m.avgEngagementRate < 0.5) {
      return {
        area: "alcance",
        status: "improvement",
        title: "Baja tasa de interaccion en relacion a tus impresiones",
        detail: `En promedio solo ${m.avgEngagementRate}% de las impresiones termina en una reaccion, comentario o repost. Un cierre que invite a comentar suele ayudar.`,
      };
    }
    return null;
  },
];

export function buildRecommendations(metrics) {
  const results = RULES.map((rule) => rule(metrics)).filter(Boolean);
  return {
    strengths: results.filter((r) => r.status === "strength"),
    improvements: results.filter((r) => r.status === "improvement"),
  };
}

export async function getRecommendations() {
  const [posts, comments, reactions, postMetrics] = await Promise.all([
    LinkedInActivity.find({ type: "post" }),
    LinkedInActivity.find({ type: "comment" }),
    LinkedInActivity.find({ type: "reaction" }),
    PostMetric.find({}),
  ]);

  const activityMetrics = computeMetricsFromRecords({ posts, comments, reactions });
  const postMetricStats = computePostMetricStats(postMetrics);
  const metrics = { ...activityMetrics, ...postMetricStats };
  const { strengths, improvements } = buildRecommendations(metrics);

  let disclaimer =
    "Basado unicamente en tu actividad propia importada (tus posts, y las reacciones/comentarios que VOS diste en posts de otros). No incluye quien reacciono o comento en tus publicaciones: el export de LinkedIn no provee ese dato.";

  if (postMetricStats.postMetricsCount > 0) {
    disclaimer +=
      " Las metricas de alcance e impresiones fueron cargadas a mano por vos desde 'Ver analisis' de cada post en LinkedIn -- no vienen de una API automatica.";
  }

  return {
    generatedAt: new Date(),
    metrics,
    strengths,
    improvements,
    disclaimer,
  };
}
