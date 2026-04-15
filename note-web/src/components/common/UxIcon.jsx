import React from 'react'

const ICON_PATHS = {
  add: '/ux-icons/add.svg',
  arrowUp: '/ux-icons/arrow-up.svg',
  arrowLeft: '/ux-icons/arrow-left.svg',
  arrowRight: '/ux-icons/arrow-right.svg',
  check: '/ux-icons/check.svg',
  close: '/ux-icons/close.svg',
  delete: '/ux-icons/delete.svg',
  editNote: '/ux-icons/edit-note.svg',
  folder: '/ux-icons/folder.svg',
  fullscreen: '/ux-icons/fullscreen.svg',
  global: '/ux-icons/language.svg',
  history: '/ux-icons/history.svg',
  info: '/ux-icons/info.svg',
  logout: '/ux-icons/logout.svg',
  menu: '/ux-icons/menu.svg',
  menuFold: '/ux-icons/menu-fold.svg',
  menuUnfold: '/ux-icons/menu-unfold.svg',
  more: '/ux-icons/more.svg',
  search: '/ux-icons/search.svg',
  share: '/ux-icons/share.svg',
  sparkle: '/ux-icons/sparkle.svg',
  star: '/ux-icons/star.svg',
  starFilled: '/ux-icons/star-filled.svg',
  summarize: '/ux-icons/summarize.svg',
  unfoldMore: '/ux-icons/unfold-more.svg',
  user: '/ux-icons/user.svg',
  sort: '/ux-icons/sort.svg',
  clock: '/ux-icons/clock.svg',
}

function UxIcon({ name, size = 18, color = 'currentColor', className = '', style = {}, title, ...props }) {
  const src = ICON_PATHS[name]

  if (!src) {
    return null
  }

  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      className={className}
      {...props}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

export default UxIcon
