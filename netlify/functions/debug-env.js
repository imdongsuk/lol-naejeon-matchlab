exports.handler = async () => {
    const keys = Object.keys(process.env).filter(function(k) {
          return /NETLIFY|SITE|BLOB|DEPLOY|URL|CONTEXT/i.test(k);
    });
    const preview = {};
    keys.forEach(function(k) {
          const v = process.env[k] || "";
          preview[k] = v.length > 8 ? v.slice(0, 8) + "...(" + v.length + "chars)" : v;
    });
    return {
          statusCode: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ relevantKeys: keys, preview }, null, 2),
    };
};
