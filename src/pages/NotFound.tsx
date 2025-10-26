export function NotFound() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: "#faf8f5",
        color: "#1a1a1a",
        padding: "20px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "clamp(80px, 15vw, 180px)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            color: "#1a1a1a",
            marginBottom: "20px",
            lineHeight: 1,
          }}
        >
          404
        </div>
        <div
          style={{
            fontSize: "clamp(20px, 4vw, 32px)",
            fontWeight: 300,
            color: "#6b6b6b",
            marginBottom: "16px",
            letterSpacing: "-0.01em",
          }}
        >
          Page not found
        </div>
        <div
          style={{
            fontSize: "clamp(14px, 2.5vw, 16px)",
            fontWeight: 400,
            color: "#6b6b6b",
            marginBottom: "48px",
            maxWidth: "480px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          Not found and found out.
          <br /> Go make a todo and get back to work.
        </div>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#EB5601",
            color: "white",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: 400,
            padding: "14px 32px",
            borderRadius: "8px",
            transition: "all 0.2s ease",
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.01em",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#d14a01";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#EB5601";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
