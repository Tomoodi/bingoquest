//カード作成補助
export type BingoCell = {
  id : string
  card_id : string
  position : number
  text : string
  is_free : boolean
  is_opend : boolean
  opened_at : string
  created_at : string
  update : string
  lesson_theme : string
  lesson_description : string
};

export type MakeCard = {
  studentWords : string[]
  teacherWords : string[]
}

export type ResponseCard = {
  words : string[]
}