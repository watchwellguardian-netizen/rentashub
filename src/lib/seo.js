import { APP_NAME } from "./brand.js";

export function setPageMeta({ title, description }) {
  if (title) document.title = title.includes(APP_NAME) ? title : `${APP_NAME} - ${title}`;

  if (!description) return;
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", description);
}
