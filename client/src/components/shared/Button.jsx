import { Link } from "react-router-dom";
import "./shared.css";

export default function Button({
  variant = "primary",
  block = false,
  to,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const classes =
    `btn btn--${variant}${block ? " btn--block" : ""} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
