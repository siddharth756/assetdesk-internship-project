// Purpose: Accessible loading spinner component

export default function Loader({ text = "Loading data..." }) {
  return (
    <div className="loader-container" role="status" aria-label={text}>
      <div className="spinner"></div>
      <span className="loader-text">{text}</span>
    </div>
  );
}
