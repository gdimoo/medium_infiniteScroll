import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { take, tap, scan } from 'rxjs/operators';

interface QueryConfig {
  path: string; //  path to collection
  field: string; // field to orderBy
  limit: number; // limit per query
  reverse: boolean; // reverse order?
  prepend: boolean; // prepend to source?
}

/**
 *
 * service ดึงข้อมูลจาก firestore มาแสดงผลแบบ infinite scroll
 * @export
 * @class PaginationService
 */
@Injectable({
  providedIn: 'root'
})
export class PaginationService<T> {

  /**
   *
   * รับข้อมูลจาก firstore โดยมีค่าเริ่มต้นเป็น [] empty array
   * @private {BehaviorSubject}
   * @memberof PaginationService
   */
  private _data = new BehaviorSubject([]);
  /**
   *
   * ถ้าข้อมูลโหลดมาสำเร็จจะเป็น true ถ้ายังไม่สำเร็จเป็น false
   * @private {BehaviorSubject}
   * @memberof PaginationService
   */
  private _loading = new BehaviorSubject(false);
  /**
   *
   * ถ้าข้อมูลที่ดึงมายังไม่หมดจะเป็น false ถ้าหมดแล้วจะเป็น true
   * @private {BehaviorSubject}
   * @memberof PaginationService
   */
  private _done = new BehaviorSubject(false);
  /**
   *
   * เก็บ option ที่จะใช้ดีงข้อมูลจาก firestore
   * @private
   * @type {QueryConfig}
   * @memberof PaginationService
   */
  private query: QueryConfig;

  // Observable data
  /**
   *
   * เก็บข้อมูลที่ดึงมาจาก firestore
   * @type {Observable<any>}
   * @memberof PaginationService
   */
  data: Observable<Array<T>>;
  /**
   *
   * ถ้าข้อมูลที่ดึงมายังไม่หมดจะเป็น false ถ้าหมดแล้วจะเป็น true
   * @type {Observable<boolean>}
   * @memberof PaginationService
   */
  done: Observable<boolean> = this._done.asObservable();
  /**
   *
   * ถ้าข้อมูลโหลดมาสำเร็จจะเป็น false ถ้ายังไม่สำเร็จเป็น true
   * @type {Observable<boolean>}
   * @memberof PaginationService
   */
  loading: Observable<boolean> = this._loading.asObservable();
  /**
   * Creates an instance of PaginationService.
   * @param {AngularFirestore} afs
   * @memberof PaginationService
   */
  constructor(private afs: AngularFirestore) { }

  /**
   * ถ้าข้อมูลดึงมาหมดแล้วหรือกำลังดึงมา จะ return ค่าว่าง และจบฟังก์ชั่น
   * ถ้าข้อมูลยังไม่หมดระหว่างทำงาน loading จะเป็น true
   * จะดึงข้อมูลมา และ return ชุดข้อมูล
   * ถ้าข้อมูลหมดแล้ว done => true
   *
   * @private
   * @param {AngularFirestoreCollection<any>} col คำสั่งที่ใช้ดึงข้อมูลจาก firestore
   * @returns 
   * @memberof PaginationService
   */
  private mapAndUpdate(col: AngularFirestoreCollection<any>) {

    if (this._done.value || this._loading.value) { return; }

    // loading
    this._loading.next(true);

    // Map snapshot with doc ref (needed for cursor) tap จับชุดข้อมูลที่ดึงมา 
    // ไปใส่ที่ค่า values โดยมีค่า doc ดูว่าข้อมูลดึงมาครบรึยัง และ data ทั้งหมด
    return col.snapshotChanges().pipe(
      tap(arr => {
        const values = arr.map(snap => {
          const data = snap.payload.doc.data();
          const doc = snap.payload.doc;
          return { ...data, doc };
        });

        // update source with new values, done loading
        this._data.next(values);
        this._loading.next(false);

        // no more values, mark done
        if (!values.length) {
          this._done.next(true);
        }
      })
      , take(1)).subscribe();

  }

  // Initial query sets options and defines the Observable
  // passing opts will override the defaults
  /**
   *
   * option ที่จะใช้ดึงข้อมูลมาจาก firestore 
   * โดยเรียกใช้ mapAndUpdate เพื่อดึงข้อมูลมาเก็บไว้ _data
   * และนำข้อมูลจาก _data มาไว้ที่ data เพื่อรวมข้อมูลใหม่กับเดิม
   * 
   * @param {string} path collection ที่จะดึงข้อมูล
   * @param {string} field field ที่จะใช้ sort ข้อมูล
   * @param {*} [opts] ตัว option อื่นๆ ที่จะใช้ดึงข้อมูล
   * @memberof PaginationService
   */
  init(path: string, field: string = 'title', opts?: any) {
    this.query = {
      path,
      field,
      limit: 2,
      where: '',
      reverse: false,
      prepend: false, //ต้องการเพิ่มข้อมูลด้านบนไหม
      ...opts
    };
    console.log('query page', this.query.field, '///', this.query.reverse);
    const first = this.afs.collection(this.query.path, ref => {
      return ref
        .orderBy(this.query.field, this.query.reverse ? 'asc' : 'desc')
        .limit(this.query.limit);
    });
    this.mapAndUpdate(first);


    // Create the observable array for consumption in components รวมข้อมูลเก่ากับที่ดึงมาใหม่
    // scan ไล่ชุดข้อมูลมาตั้งแต่เริ่มต้นถึงปัจจุบัน
    // acc : เป็นค่าปัจจุบัน val : ค่าที่ดึงมาใหม่
    this.data = this._data.asObservable().pipe(
      scan((acc, val) => {
        return this.query.prepend ? val.concat(acc) : acc.concat(val);
      }));
  }


  // Retrieves additional data from firestore
  /**
   *
   * ดึงข้อมูลออกมาต่อจากข้อมูลชุดเดิม โดยเรียกใช้ getCursor() เพื่อรับ doc ตำแหน่งล่าสุด
   * @memberof PaginationService
   */
  more() {
    const cursor = this.getCursor();
    console.log('cursor', cursor);

    const more = this.afs.collection(this.query.path, ref => {
      return ref
        .orderBy(this.query.field, this.query.reverse ? 'asc' : 'desc')
        .limit(this.query.limit)
        .startAfter(cursor);
    });
    this.mapAndUpdate(more);
  }


  // Determines the doc snapshot to paginate query
  /**
   *
   * ถ้าค่าความยาวชุดข้อมูลยังไม่หมด ส่งค่า doc ตำแหน่งสุดท้ายกลับ
   * ถ้าข้อมหมดแล้ว retrun null
   * @private
   * @returns
   * @memberof PaginationService
   */
  private getCursor() {
    const current = this._data.value;

    if (current.length) {
      return this.query.prepend ? current[0].doc : current[current.length - 1].doc;
    }
    return null;
  }

}