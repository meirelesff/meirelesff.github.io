# ---
# COPIA A EMENTA PDF PARA O SITE ANTES DA RENDERIZAÇÃO
# ---

arquivo_origem <- file.path(
  "..",
  "ementa_laboratorio",
  "ementa_laboratorio.pdf"
)
arquivo_destino <- file.path(
  "docs",
  "ementa_laboratorio.pdf"
)

if (!file.exists(arquivo_origem)) {
  stop(
    sprintf("A ementa em PDF não foi encontrada: %s", arquivo_origem),
    call. = FALSE
  )
}

if (!file.copy(arquivo_origem, arquivo_destino, overwrite = TRUE)) {
  stop(
    sprintf("Não foi possível copiar a ementa para: %s", arquivo_destino),
    call. = FALSE
  )
}

# ---
# ATUALIZA O ZIP DO TEMPLATE DE RELATÓRIOS
# ---

diretorio_template <- file.path("..", "template_relatorios")
arquivo_zip <- "template.zip"
arquivos_template <- c(
  "artigo.qmd",
  "referencias.bib",
  "README.md",
  "template_quarto.Rproj",
  "LICENSE"
)

arquivos_ausentes <- arquivos_template[
  !file.exists(file.path(diretorio_template, arquivos_template))
]

if (length(arquivos_ausentes) > 0) {
  stop(
    sprintf(
      "Arquivos ausentes no template_relatorios/: %s",
      paste(arquivos_ausentes, collapse = ", ")
    ),
    call. = FALSE
  )
}

if (!nzchar(Sys.which("zip"))) {
  stop(
    "O comando zip não foi encontrado; ele é necessário para atualizar template.zip.",
    call. = FALSE
  )
}

criar_zip_template <- function(arquivo_destino, diretorio_origem, arquivos) {
  diretorio_anterior <- getwd()
  diretorio_temporario <- tempfile("template_relatorios-")
  dir.create(diretorio_temporario, recursive = TRUE)

  on.exit({
    setwd(diretorio_anterior)
    unlink(diretorio_temporario, recursive = TRUE, force = TRUE)
  })

  diretorio_pacote <- file.path(
    diretorio_temporario,
    "template_relatorios"
  )
  dir.create(diretorio_pacote)

  arquivos_copiados <- file.copy(
    from = file.path(diretorio_origem, arquivos),
    to = diretorio_pacote,
    overwrite = TRUE
  )

  if (!all(arquivos_copiados)) {
    stop(
      "Não foi possível copiar todos os arquivos para o ZIP do template.",
      call. = FALSE
    )
  }

  setwd(diretorio_temporario)
  status_zip <- utils::zip(
    zipfile = "template.zip",
    files = "template_relatorios",
    flags = "-qr"
  )

  arquivo_temporario <- file.path(diretorio_temporario, "template.zip")

  if (!file.exists(arquivo_temporario) || (!is.null(status_zip) && status_zip != 0)) {
    stop(
      "Não foi possível criar o ZIP do template_relatorios/.",
      call. = FALSE
    )
  }

  setwd(diretorio_anterior)

  if (!file.copy(arquivo_temporario, arquivo_destino, overwrite = TRUE)) {
    stop(
      sprintf("Não foi possível copiar o ZIP para: %s", arquivo_destino),
      call. = FALSE
    )
  }
}

criar_zip_template(
  arquivo_destino = arquivo_zip,
  diretorio_origem = diretorio_template,
  arquivos = arquivos_template
)
